import { describe, it, expect, vi } from "vitest";
import { Synqra } from "../src/synqra.js";
import { PostgresAdapter } from "../src/adapters/postgres.js";
import { MongoAdapter } from "../src/adapters/mongo.js";

// Mock to skip DB hits
vi.mock("pg", () => {
    return {
        Client: vi.fn().mockImplementation(() => ({
            connect: vi.fn(),
            query: vi.fn().mockImplementation((q: string) => {
                // Mock information_schema requests
                if (q.includes("EXISTS")) {
                    return Promise.resolve({ rows: [{ exists: false }] });
                }
                if (q.includes("column_name")) {
                    return Promise.resolve({ rows: [] });
                }
                return Promise.resolve({ rows: [] });
            }),
        }))
    };
});

vi.mock("mongodb", () => {
    return {
        MongoClient: vi.fn().mockImplementation(() => ({
            connect: vi.fn(),
            db: vi.fn().mockReturnValue({
                listCollections: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
                collection: vi.fn(),
                command: vi.fn().mockResolvedValue({ ok: 1 })
            })
        }))
    };
});

describe("Cross-Database Schema Migration CLI Core", () => {
    const pgAdapter = new PostgresAdapter({ connectionString: "mock" });
    const mongoAdapter = new MongoAdapter({ uri: "mock", database: "test" });

    const pgDb = new Synqra(pgAdapter);
    const mongoDb = new Synqra(mongoAdapter);

    // Standard cross DB Model
    const defineUser = (db: Synqra) => db.model("User", {
        name: "string",
        email: "string",
        age: "number",
        active: "boolean"
    });

    defineUser(pgDb);
    defineUser(mongoDb);

    it("should generate a valid Postgres SQL CREATE TABLE plan", async () => {
        await pgDb.connect();
        const plan = await pgDb.planSync();
        expect(plan.type).toBe("sql");
        expect(plan.operations.length).toBeGreaterThan(0);

        const sql = plan.operations[0] as string;
        expect(sql).toContain('CREATE TABLE "users"');
        expect(sql).toContain('"name" VARCHAR(255)');
        expect(sql).toContain('"age" FLOAT');
        expect(sql).toContain('"active" BOOLEAN');
    });

    it("should generate a valid Mongo driver JSON Schema enforcement validation plan", async () => {
        await mongoDb.connect();
        const plan = await mongoDb.planSync();
        expect(plan.type).toBe("mongo");

        // Mongo enforces collections + validations
        expect(plan.operations.length).toBe(2);

        const createOp: any = plan.operations[0];
        expect(createOp.create).toBe("users");

        const validatorOp: any = plan.operations[1];
        expect(validatorOp.collMod).toBe("users");
        expect(validatorOp.validator.$jsonSchema).toBeDefined();
        expect(validatorOp.validator.$jsonSchema.properties.name.bsonType).toBe("string");
        expect(validatorOp.validator.$jsonSchema.properties.age.bsonType).toContain("int");
    });
});
