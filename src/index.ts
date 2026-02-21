// Main entry point - re-export everything
export { Synqra } from "./synqra.js";
export { Model } from "./core/model.js";
export { MongoAdapter } from "./adapters/mongo.js";
export { PostgresAdapter } from "./adapters/postgres.js";
export type { Adapter } from "./core/adapter.js";
export type { SchemaDefinition } from "./core/schema.js";
export type { QueryAST, Condition, Operator, LogicalGroup } from "./core/query.js";
