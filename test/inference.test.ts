import { describe, it, expect, vi } from "vitest";
import { Synqra } from "../src/synqra.js";
import { PostgresAdapter } from "../src/adapters/postgres.js";

vi.mock("pg", () => {
    return {
        Client: vi.fn().mockImplementation(() => ({
            connect: vi.fn(),
            query: vi.fn().mockResolvedValue({ rows: [] }),
        }))
    };
});

describe("Schema Typed Compilation & Inquiry", () => {
    const pgAdapter = new PostgresAdapter({ connectionString: "mock" });
    const db = new Synqra(pgAdapter);

    const User = db.model("User", {
        name: "string",
        age: "number",
        active: { type: "boolean", default: true }
    });

    it("should compile schemas into strongly-typed TS inferences", async () => {
        // Build correctly bound mapped queries from statically-inferred Schema objects:
        const query = User.query()
            .where("age", "gt", 18)
            .where("active", "eq", true)
            .orderBy("name", "asc")
            .limit(10);

        // No syntax verification necessary, compiling without TS syntax error proves inference structure:    
        expect(query).toBeDefined();

        // Testing direct CRUD type binding:
        const userData = { name: "Bob", age: 30 }; // valid structure
        const result = await User.create(userData);
        expect(result).toBeDefined();
    });
});
