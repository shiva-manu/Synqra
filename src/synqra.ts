import { Adapter, QueryObserver, QueryMetrics } from "./core/adapter.js";
import { QueryBuilder } from "./query/builder.js";
import { Model } from "./core/model.js";
import { ModelSchema, createZodSchema, SchemaDefinition, InferSchemaType } from "./core/schema.js";
import { validateQuery } from "./core/planner.js";
import { QueryAST } from "./core/query.js";

// Export Model for extending
export { Model } from "./core/model.js";
export type { SchemaDefinition, InferSchemaType } from "./core/schema.js";

// Export adapters
export { MongoAdapter } from "./adapters/mongo.js";
export { PostgresAdapter } from "./adapters/postgres.js";
export type { Adapter, QueryObserver, QueryMetrics } from "./core/adapter.js";

export class Synqra {
  private models: Map<string, ModelSchema> = new Map();
  private adapters: Map<string, Adapter> = new Map();
  private observers: QueryObserver[] = [];

  constructor(adapter: Adapter) {
    this.addAdapter("primary", adapter);
  }

  addAdapter(name: string, adapter: Adapter) {
    this.adapters.set(name, adapter);
    return this;
  }

  addObserver(observer: QueryObserver) {
    this.observers.push(observer);
    return this;
  }

  async connect() {
    for (const adapter of this.adapters.values()) {
      await adapter.connect();
    }
  }

  getAdapterByIntent(intent?: string): Adapter {
    if (intent === "aggregate" && this.adapters.has("analytics")) {
      return this.adapters.get("analytics")!;
    }
    if (intent === "read" && this.adapters.has("replica")) {
      // Simple random load balancing for replicas if we had multiple, 
      // but for now just check if one exists.
      return this.adapters.get("replica")!;
    }
    return this.adapters.get("primary")!;
  }

  observe(metrics: QueryMetrics, plan: any, query: QueryAST) {
    for (const observer of this.observers) {
      observer(metrics, plan, query);
    }
  }

  from<T = any>(table: string) {
    return new SynqraQuery<T>(this, table);
  }

  model<
    D extends SchemaDefinition,
    T = InferSchemaType<D>
  >(
    name: string,
    definition: D
  ): typeof Model & {
    new(data?: Partial<T>): Model & T;
    find(filter?: Partial<T> | Record<string, any>): Promise<T[]>;
    findOne(filter: Partial<T> | Record<string, any>): Promise<T | null>;
    create(data: Omit<T, "id"> | Record<string, any>): Promise<T>;
    update(filter: Partial<T> | Record<string, any>, data: Partial<T> | Record<string, any>): Promise<T[]>;
    delete(filter: Partial<T> | Record<string, any>): Promise<any>;
    query(): SynqraQuery<T>;
  } {
    const table = name.toLowerCase() + "s"; // Pluralize by default
    const zodSchema = createZodSchema(definition);

    const schema: ModelSchema = {
      name,
      table,
      fields: definition,
      zodSchema,
    };

    this.models.set(name, schema);

    const dbInstance = this;
    const primaryAdapter = this.getAdapterByIntent("write");

    // Create model class dynamically
    class DynamicModel extends Model {
      static schema = schema;
      static adapter = primaryAdapter;
      static dbInstance = dbInstance;
    }

    // Set static properties
    DynamicModel.setSchema(schema);
    DynamicModel.setAdapter(primaryAdapter);
    DynamicModel.setDbInstance(dbInstance);

    // Fix type error: cast to unknown first, then to T
    return DynamicModel as any;
  }

  getModel(name: string): ModelSchema | undefined {
    return this.models.get(name);
  }

  getModels(): ModelSchema[] {
    return Array.from(this.models.values());
  }

  async sync() {
    const primary = this.getAdapterByIntent("write");
    if (primary.capabilities.supportsSchemaSync) {
      await primary.sync(Array.from(this.models.values()));
    } else {
      console.warn("Primary adapter does not support schema synchronization.");
    }
  }

  async planSync() {
    const primary = this.getAdapterByIntent("write");
    if (primary.capabilities.supportsSchemaSync) {
      return await primary.planSync(Array.from(this.models.values()));
    }
    throw new Error("Primary adapter does not support schema synchronization.");
  }

  async transaction(callback: (tx: Synqra) => Promise<void>) {
    const primary = this.getAdapterByIntent("write");
    try {
      await primary.begin();
      await callback(this);
      await primary.commit();
    } catch (err) {
      await primary.rollback();
      throw err;
    }
  }
}

class SynqraQuery<T = any> {
  private builder: QueryBuilder<T>;
  private forcedIntent?: "read" | "write" | "aggregate";

  constructor(private db: Synqra, table: string) {
    this.builder = new QueryBuilder<T>(table);
  }

  intent(val: "read" | "write" | "aggregate") {
    this.forcedIntent = val;
    return this;
  }

  where<K extends keyof T & string>(field: K, operator: "eq" | "gt" | "lt" | "gte" | "lte" | "in", value: any) {
    this.builder.where(field, operator, value);
    return this;
  }

  limit(n: number) {
    this.builder.limit(n);
    return this;
  }

  offset(n: number) {
    this.builder.offset(n);
    return this;
  }

  paginate(page: number, pageSize: number) {
    this.builder.paginate(page, pageSize);
    return this;
  }

  orderBy<K extends keyof T & string>(field: K, direction: "asc" | "desc") {
    this.builder.orderBy(field, direction);
    return this;
  }

  select<K extends keyof T & string>(fields: K[]) {
    this.builder.select(fields);
    return this;
  }

  groupBy<K extends keyof T & string>(fields: K[]) {
    this.builder.groupBy(fields);
    return this;
  }

  count<K extends keyof T & string>(field: K, alias?: string) {
    this.builder.count(field, alias);
    return this;
  }

  sum<K extends keyof T & string>(field: K, alias?: string) {
    this.builder.sum(field, alias);
    return this;
  }

  avg<K extends keyof T & string>(field: K, alias?: string) {
    this.builder.avg(field, alias);
    return this;
  }

  min<K extends keyof T & string>(field: K, alias?: string) {
    this.builder.min(field, alias);
    return this;
  }

  max<K extends keyof T & string>(field: K, alias?: string) {
    this.builder.max(field, alias);
    return this;
  }

  async find(): Promise<T[]> {
    const query = this.builder.build();
    query.intent = this.forcedIntent || "read";
    return await this.execute(query);
  }

  async insert(data: Partial<T> | Record<string, any>): Promise<T | any> {
    const query = this.builder.insert(data).build();
    query.intent = this.forcedIntent || "write";
    return await this.execute(query);
  }

  async update(data: Partial<T> | Record<string, any>) {
    const query = this.builder.update(data).build();
    query.intent = this.forcedIntent || "write";
    return await this.execute(query);
  }

  async delete() {
    const query = this.builder.delete().build();
    query.intent = this.forcedIntent || "write";
    return await this.execute(query);
  }

  private async execute(query: QueryAST) {
    const start = performance.now();
    const adapter = this.db.getAdapterByIntent(query.intent);

    const planStart = performance.now();
    const plan = adapter.plan(query);
    const planningTimeMs = performance.now() - planStart;

    validateQuery(query, adapter.capabilities);

    const execStart = performance.now();
    const result = await adapter.execute(query);
    const executionTimeMs = performance.now() - execStart;

    const totalTimeMs = performance.now() - start;

    this.db.observe({
      planningTimeMs,
      executionTimeMs,
      totalTimeMs,
      adapter: adapter.name
    }, plan, query);

    return result;
  }
}