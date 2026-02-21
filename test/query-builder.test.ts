import { describe, it, expect } from "vitest";
import { QueryBuilder } from "../src/query/builder.js";

describe("QueryBuilder", () => {
  it("should build a simple SELECT query", () => {
    const builder = new QueryBuilder("users");
    const query = builder.build();

    expect(query.type).toBe("select");
    expect(query.table).toBe("users");
  });

  it("should build a SELECT query with WHERE clause", () => {
    const builder = new QueryBuilder("users");
    builder.where("age", "gt", 18);
    const query = builder.build();

    expect(query.conditions).toHaveLength(1);
    expect(query.conditions?.[0]).toEqual({
      field: "age",
      operator: "gt",
      value: 18,
    });
  });

  it("should build an INSERT query", () => {
    const builder = new QueryBuilder("users");
    builder.insert({ name: "John", age: 30 });
    const query = builder.build();

    expect(query.type).toBe("insert");
    expect(query.data).toEqual({ name: "John", age: 30 });
  });

  it("should build an UPDATE query", () => {
    const builder = new QueryBuilder("users");
    builder.where("id", "eq", 1);
    builder.update({ age: 31 });
    const query = builder.build();

    expect(query.type).toBe("update");
    expect(query.data).toEqual({ age: 31 });
    expect(query.conditions).toHaveLength(1);
  });

  it("should build a DELETE query", () => {
    const builder = new QueryBuilder("users");
    builder.where("id", "eq", 1);
    builder.delete();
    const query = builder.build();

    expect(query.type).toBe("delete");
    expect(query.conditions).toHaveLength(1);
  });

  it("should build a query with LIMIT", () => {
    const builder = new QueryBuilder("users");
    builder.limit(10);
    const query = builder.build();

    expect(query.limit).toBe(10);
  });

  it("should build a query with ORDER BY", () => {
    const builder = new QueryBuilder("users");
    builder.orderBy("age", "desc");
    const query = builder.build();

    expect(query.orderBy).toEqual({ field: "age", direction: "desc" });
  });

  it("should build a query with SELECT projection", () => {
    const builder = new QueryBuilder("users");
    builder.select(["name", "age"]);
    const query = builder.build();

    expect(query.select).toEqual(["name", "age"]);
  });
});
