import { describe, it, expect, vi } from "vitest";
import { Synqra } from "../src/synqra.js";
import { PostgresAdapter } from "../src/adapters/postgres.js";
import { MongoAdapter } from "../src/adapters/mongo.js";

vi.mock("pg", () => ({
    Client: vi.fn().mockImplementation(() => ({
        connect: vi.fn(),
        query: vi.fn().mockResolvedValue({ rows: [] }),
    }))
}));

vi.mock("mongodb", () => ({
    MongoClient: vi.fn().mockImplementation(() => ({
        connect: vi.fn(),
        db: vi.fn().mockReturnValue({
            listCollections: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
            collection: vi.fn().mockReturnValue({
                find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
                aggregate: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
            })
        })
    }))
}));

describe("Distributed Topology & Observability Control Plane", () => {
    it("should route queries to primary for writes and replicas for reads", async () => {
        const primary = new PostgresAdapter({ name: "primary-pg" });
        primary.name = "primary-pg";

        const replica = new PostgresAdapter({ name: "replica-pg" });
        replica.name = "replica-pg";

        const db = new Synqra(primary);
        db.addAdapter("replica", replica);
        await db.connect();

        const metricsList: any[] = [];
        db.addObserver((metrics) => {
            metricsList.push(metrics);
        });

        // Write query -> Should hit primary
        await db.from("users").insert({ name: "Alice" });
        expect(metricsList[0].adapter).toBe("primary-pg");

        // Read query -> Should hit replica
        await db.from("users").find();
        expect(metricsList[1].adapter).toBe("replica-pg");
    });

    it("should route analytical queries to analytics adapter", async () => {
        const primary = new PostgresAdapter({});
        primary.name = "main-sql";

        const analytics = new MongoAdapter({ uri: "mock", database: "analytics" });
        analytics.name = "big-data-mongo";

        const db = new Synqra(primary);
        db.addAdapter("analytics", analytics);
        await db.connect();

        const metricsList: any[] = [];
        db.addObserver((metrics) => metricsList.push(metrics));

        // Forced intent or inference
        await db.from("sales").intent("aggregate").find();
        expect(metricsList[0].adapter).toBe("big-data-mongo");
    });

    it("should capture detailed timing metrics", async () => {
        const db = new Synqra(new PostgresAdapter({}));
        await db.connect();

        let capturedMetrics: any;
        db.addObserver((metrics) => capturedMetrics = metrics);

        await db.from("logs").find();

        expect(capturedMetrics.planningTimeMs).toBeGreaterThanOrEqual(0);
        expect(capturedMetrics.executionTimeMs).toBeGreaterThanOrEqual(0);
        expect(capturedMetrics.totalTimeMs).toBeGreaterThanOrEqual(capturedMetrics.executionTimeMs);
    });
});
