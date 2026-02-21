import { QueryAST } from "./query.js";
import { ModelSchema } from "./schema.js";

export interface AdapterCapabilities {
  supportsTransactions: boolean;
  supportsAggregation: boolean;
  supportsJoins: boolean;
  supportsSchemaSync: boolean;
}

export type QueryPlan = {
  type: "sql" | "mongo-pipeline" | "mongo-query";
  query?: string;     // SQL Output
  values?: any[];     // SQL Params
  filter?: any;       // Mongo JSON condition
  pipeline?: any[];   // Mongo Pipeline
  options?: any;
  data?: any;         // Data for insert/update operations
};

export type MigrationPlan = {
  type: "sql" | "mongo";
  operations: string[] | any[]; // SQL strings or Mongo driver commands mapped object arrays
  logs: string[];   // Plain English logs describing what was planned
};

export interface Adapter {
  capabilities: AdapterCapabilities;
  connect(): Promise<void>;
  plan(query: QueryAST): QueryPlan;
  execute(query: QueryAST): Promise<any>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  planSync(models: ModelSchema[]): Promise<MigrationPlan>;
  sync(models: ModelSchema[]): Promise<void>;
}