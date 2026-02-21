import { Adapter } from "./core/adapter.js";
import { QueryBuilder } from "./query/builder.js";
import { Model } from "./core/model.js";
import { ModelSchema, createZodSchema, SchemaDefinition, InferSchemaType } from "./core/schema.js";
import { validateQuery } from "./core/planner.js";

// Export Model for extending
export { Model } from "./core/model.js";
export type { SchemaDefinition, InferSchemaType } from "./core/schema.js";

// Export adapters
export { MongoAdapter } from "./adapters/mongo.js";
export { PostgresAdapter } from "./adapters/postgres.js";
export type { Adapter } from "./core/adapter.js";

export class Synqra {
  private models: Map<string, ModelSchema> = new Map();

  constructor(private adapter: Adapter) { }

  async connect() {
    await this.adapter.connect();
  }

  from<T = any>(table: string) {
    return new SynqraQuery<T>(this.adapter, table);
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

    const adapter = this.adapter;
    const dbInstance = this;

    // Create model class dynamically
    class DynamicModel extends Model {
      static schema = schema;
      static adapter = adapter;
      static dbInstance = dbInstance;
    }

    // Set static properties
    DynamicModel.setSchema(schema);
    DynamicModel.setAdapter(adapter);
    DynamicModel.setDbInstance(dbInstance);

    // Fix type error: cast to unknown first, then to T
    return DynamicModel as any;
  }

  getModel(name: string): ModelSchema | undefined {
    return this.models.get(name);
  }

  async transaction(callback: (tx: Synqra) => Promise<void>) {
    try {
      await this.adapter.begin();
      await callback(this);
      await this.adapter.commit();
    } catch (err) {
      await this.adapter.rollback();
      throw err;
    }
  }
}

class SynqraQuery<T = any> {
  private builder: QueryBuilder<T>;

  constructor(private adapter: Adapter, table: string) {
    this.builder = new QueryBuilder<T>(table);
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
    validateQuery(query, this.adapter.capabilities);
    return await this.adapter.execute(query);
  }

  async insert(data: Partial<T> | Record<string, any>): Promise<T | any> {
    const query = this.builder.insert(data).build();
    validateQuery(query, this.adapter.capabilities);
    return await this.adapter.execute(query);
  }

  async update(data: Partial<T> | Record<string, any>) {
    const query = this.builder.update(data).build();
    validateQuery(query, this.adapter.capabilities);
    return await this.adapter.execute(query);
  }

  async delete() {
    const query = this.builder.delete().build();
    validateQuery(query, this.adapter.capabilities);
    return await this.adapter.execute(query);
  }
}