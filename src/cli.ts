#!/usr/bin/env node

import { resolve } from "path";
import { existsSync } from "fs";
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { auth, project } from "./core/config.js";
import axios from "axios";

const program = new Command();

program
    .name("synqra")
    .description("SaaS-backed Database Control Plane CLI")
    .version("0.1.0");

// --- Existing Commands (Refactored) ---

program
    .command("plan")
    .description("Show what schema changes synqra will execute.")
    .action(async () => {
        const db = await loadDbInstance();
        if (!db) return;

        const spinner = ora("Analyzing current defined Model Schemas...").start();
        try {
            await db.connect();
            const plan = await db.planSync();
            spinner.stop();

            console.log(chalk.bold("\n--- Migration Plan ---"));
            if (plan.logs.length === 0) {
                console.log(chalk.green("Your schema looks fully synchronized and in parity!"));
            } else {
                plan.logs.forEach((log: string) => console.log(chalk.yellow(` * ${log}`)));
            }
        } catch (error: any) {
            spinner.fail("Failed to plan synchronization");
            console.error(chalk.red(error.message));
        }
    });

program
    .command("sync")
    .description("Execute schema synchronization.")
    .action(async () => {
        const db = await loadDbInstance();
        if (!db) return;

        const spinner = ora("Executing schema synchronization...").start();
        try {
            await db.connect();
            await db.sync();
            spinner.succeed("Schema natively mapped & pushed to DB driver successfully.");
        } catch (error: any) {
            spinner.fail("Sync failed");
            console.error(chalk.red(error.message));
        }
    });

// --- New SaaS Commands ---

program
    .command("login")
    .description("Connect CLI to your Synqra Cloud account")
    .action(async () => {
        console.log(chalk.blue.bold("\n🚀 Welcome to Synqra Cloud"));

        const { method } = await inquirer.prompt([
            {
                type: "list",
                name: "method",
                message: "Choose login method:",
                choices: ["API Key", "GitHub (Coming Soon)"]
            }
        ]);

        if (method === "API Key") {
            const { apiKey } = await inquirer.prompt([
                {
                    type: "password",
                    name: "apiKey",
                    message: "Paste your Synqra API Key (or password):",
                    validate: (val) => val.length > 0
                }
            ]);

            const { email } = await inquirer.prompt([
                {
                    name: "email",
                    message: "Email:",
                    validate: (val) => val.includes("@")
                }
            ]);

            const spinner = ora("Verifying credentials...").start();

            try {
                const response = await axios.post(`${auth.getServerUrl()}/v1/auth/login`, {
                    email,
                    password: apiKey
                });

                const { token, user } = response.data;
                auth.setToken(token);
                auth.setUser(user.email, user.id);
                spinner.succeed(`Successfully logged in as ${chalk.green(user.email)}`);
            } catch (error: any) {
                spinner.fail("Login failed");
                console.error(chalk.red(error.response?.data?.error || error.message));
            }
        }
    });

program
    .command("link")
    .description("Link local project to a Synqra Cloud project")
    .action(async () => {
        if (!auth.isLoggedIn()) {
            console.log(chalk.yellow("You must be logged in to link a project. Run 'synqra login' first."));
            return;
        }

        const spinner = ora("Fetching projects from Synqra Cloud...").start();

        try {
            const response = await axios.get(`${auth.getServerUrl()}/v1/projects`, {
                headers: { Authorization: `Bearer ${auth.getToken()}` }
            });
            spinner.stop();

            const projects = response.data;
            const choices = [
                ...projects.map((p: any) => ({ name: p.name, value: p.id })),
                { name: chalk.cyan("+ Create New Project"), value: "new" }
            ];

            const { selectedId } = await inquirer.prompt([
                {
                    type: "list",
                    name: "selectedId",
                    message: "Select a project to link:",
                    choices
                }
            ]);

            let projectId = selectedId;
            if (selectedId === "new") {
                const { name } = await inquirer.prompt([
                    { name: "name", message: "Project Name:", validate: (val) => val.length > 0 }
                ]);

                const createResponse = await axios.post(`${auth.getServerUrl()}/v1/projects`, { name }, {
                    headers: { Authorization: `Bearer ${auth.getToken()}` }
                });
                projectId = createResponse.data.id;
                console.log(chalk.green(`Created project: ${name} (${projectId})`));
            }

            project.link(projectId);
            console.log(chalk.cyan(`✅ Project linked successfully! Project ID: ${chalk.bold(projectId)}`));
        } catch (error: any) {
            spinner.fail("Failed to link project");
            console.error(chalk.red(error.response?.data?.error || error.message));
        }
    });

program
    .command("push")
    .description("Push local schema and migration history to Synqra Cloud")
    .action(async () => {
        if (!auth.isLoggedIn()) {
            console.log(chalk.yellow("Please login first: synqra login"));
            return;
        }

        const projectConfig = project.getConfig();
        if (!projectConfig?.projectId) {
            console.log(chalk.yellow("Project not linked. Run 'synqra link' first."));
            return;
        }

        const db = await loadDbInstance();
        if (!db) return;

        const schemas = db.getModels();
        const spinner = ora(`Pushing ${schemas.length} models to Synqra Cloud...`).start();

        try {
            const response = await axios.post(`${auth.getServerUrl()}/v1/projects/${projectConfig.projectId}/push`, {
                schemaSnapshot: schemas
            }, {
                headers: { Authorization: `Bearer ${auth.getToken()}` }
            });

            if (response.data.status === 'no-change') {
                spinner.info("Schema is already up to date on Synqra Cloud.");
            } else {
                spinner.succeed(`Successfully pushed new schema version to ${chalk.bold(projectConfig.projectId)}!`);
            }
            console.log(chalk.dim(`View dashboard at: ${auth.getServerUrl()}/projects/${projectConfig.projectId}`));
        } catch (error: any) {
            spinner.fail("Failed to push schema to cloud");
            console.error(chalk.red(error.response?.data?.error || error.message));
        }
    });

// --- Helper Functions ---

async function loadDbInstance() {
    const configPath = resolve(process.cwd(), "synqra.config.js");

    if (!existsSync(configPath)) {
        console.error(chalk.red("Error: Could not find synqra.config.js in current directory."));
        return null;
    }

    try {
        const configModule = await import(`file://${configPath}`);
        const db = configModule.default;

        if (!db || typeof db.sync !== "function") {
            console.error(chalk.red("Error: synqra.config.js must export default a valid Synqra DB instance."));
            return null;
        }

        return db;
    } catch (error) {
        console.error(chalk.red("Fatal error loading synqra.config.js:"));
        console.error(error);
        return null;
    }
}

program.parse();
