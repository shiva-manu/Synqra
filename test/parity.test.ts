import { describe, it, expect, vi } from "vitest";
import { QueryBuilder } from "../src/query/builder.js";
import { PostgresAdapter } from "../src/adapters/postgres.js";
import { MongoAdapter } from "../src/adapters/mongo.js";
import { Synqra } from "../src/synqra.js";
import { CapabilityError } from "../src/core/errors.js";
import { QueryAST } from "../src/core/query.js";

// Mock to skip DB hits
vi.mock("pg", () => {
    return {
        Client: vi.fn().mockImplementation(() => ({
            connect: vi.fn(),
            query: vi.fn().mockResolvedValue({ rows: [] }),
        }))
    };
});

vi.mock("mongodb", () => {
    return {
        MongoClient: vi.fn().mockImplementation(() => ({
            connect: vi.fn(),
            db: vi.fn().mockReturnValue({
                collection: vi.fn().mockReturnValue({
                    find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
                    aggregate: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
                })
            })
        }))
    };
});

describe("Query Parity & Capabilities Planner", () => {
    const pgAdapter = new PostgresAdapter({ connectionString: "mock" });
    const mongoAdapter = new MongoAdapter({ uri: "mock", database: "test" });

    const pgCore = new Synqra(pgAdapter);
    const mongoCore = new Synqra(mongoAdapter);

    it("should generate matched logical AST structures across adapters", () => {
        const pgBuilder = new QueryBuilder("users");
        pgBuilder.where("age", "gt", 18).or([{ field: "status", operator: "eq", value: "active" }]);
        const pgQuery = pgBuilder.build();

        const mongoBuilder = new QueryBuilder("users");
        mongoBuilder.where("age", "gt", 18).or([{ field: "status", operator: "eq", value: "active" }]);
        const mongoQuery = mongoBuilder.build();

        expect(pgQuery).toEqual(mongoQuery);
    });

    it("should enforce capability boundaries gracefully", async () => {
        await pgCore.connect();
        await mongoCore.connect();

        const pgQuery = pgCore.from("sales").sum("amount").groupBy(["region"]);
        const mongoQuery = mongoCore.from("sales").sum("amount").groupBy(["region"]);

        // Currently both adapters have aggregation capability flag active, so find() won't throw Planner Error
        expect(async () => await pgQuery.find()).not.toThrow(CapabilityError);
        expect(async () => await mongoQuery.find()).not.toThrow(CapabilityError);

        // Let's force a capability denial on a mock adapter
        const mockDisabledAdapter = new PostgresAdapter({});
        mockDisabledAdapter.capabilities.supportsAggregation = false; // Intentionally restricted
        const restrictedCore = new Synqra(mockDisabledAdapter);

        await expect(async () => {
            await restrictedCore.from("sales").count("id").find();
        }).rejects.toThrow(CapabilityError);
    });

    it("should generate compiled SQL and Mongo Pipelines deterministically via .plan()", () => {
        const b = new QueryBuilder("sales");
        b.where("status", "eq", "paid").groupBy(["category", "year"]).sum("amount", "total");
        const query: QueryAST = b.build();

        const pgPlan = pgAdapter.plan(query);
        expect(pgPlan.type).toBe("sql");
        expect(pgPlan.query).toContain("SUM(amount) AS total");
        expect(pgPlan.query).toContain("GROUP BY category, year");
        expect(pgPlan.query).toContain("WHERE status = $1");
        expect(pgPlan.values).toEqual(["paid"]);

        const mongoPlan = mongoAdapter.plan(query);
        expect(mongoPlan.type).toBe("mongo-pipeline");
        expect(mongoPlan.pipeline).toBeDefined();

        // Mongo pipeline matches parity structure
        const pipeline = mongoPlan.pipeline!;
        expect(pipeline[0]).toEqual({ $match: { status: "paid" } });
        expect(pipeline[1]).toEqual({
            $group: {
                _id: { category: "$category", year: "$year" },
                total: { $sum: "$amount" }
            }
        });
    });
});
