#!/usr/bin/env node

import { resolve } from "path";
import { existsSync } from "fs";

async function run() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log("Usage: synqra <command>");
        console.log("Commands:");
        console.log("  plan   - Show what schema changes synqra will execute.");
        console.log("  sync  - Execute schema synchronization.");
        process.exit(0);
    }

    const configPath = resolve(process.cwd(), "synqra.config.js");

    if (!existsSync(configPath)) {
        console.error("Error: Could not find synqra.config.js in current directory.");
        console.error("Please export an initialized Synqra DB instance as default from synqra.config.js");
        process.exit(1);
    }

    try {
        const configModule = await import(configPath);
        const db = configModule.default;

        if (!db || typeof db.sync !== "function") {
            console.error("Error: synqra.config.js must `export default` a valid Synqra DB instance.");
            process.exit(1);
        }

        // Connect DB before syncing
        await db.connect();

        if (command === "plan") {
            console.log("Analyzing current defined Model Schemas...");
            const plan = await db.planSync();

            console.log("\n--- Migration Plan ---");
            if (plan.logs.length === 0) {
                console.log("Your schema looks fully synchronized and in parity!");
            } else {
                plan.logs.forEach((log: string) => console.log(` * ${log}`));
            }

        } else if (command === "sync") {
            console.log("Executing schema synchronization...");
            await db.sync();
            console.log("✅ Schema natively mapped & pushed to DB driver successfully.");
        } else {
            console.error(`Unknown command: ${command}`);
            process.exit(1);
        }

        process.exit(0);
    } catch (error: any) {
        console.error("Fatal exception during execution:");
        console.error(error);
        process.exit(1);
    }
}

run();
