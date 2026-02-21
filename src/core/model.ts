import { Adapter } from "./adapter.js";
import { QueryBuilder } from "../query/builder.js";
import { ModelSchema, applyDefaults } from "./schema.js";

export class Model {
  protected static schema?: ModelSchema;
  protected static adapter?: Adapter;
  protected static dbInstance?: any; // Synqra instance

  static setSchema(schema: ModelSchema) {
    this.schema = schema;
  }

  static setAdapter(adapter: Adapter) {
    this.adapter = adapter;
  }

  static setDbInstance(db: any) {
    this.dbInstance = db;
  }

  // Instance data
  [key: string]: any;

  constructor(data: Record<string, any> = {}) {
    const ModelClass = this.constructor as typeof Model;
    if (!ModelClass.schema) {
      throw new Error("Model schema not set. Call db.model() first.");
    }

    // Apply defaults
    const dataWithDefaults = applyDefaults(data, ModelClass.schema.fields);

    // Validate data
    const validated = ModelClass.schema.zodSchema.parse(dataWithDefaults);

    // Assign to instance
    Object.assign(this, validated);
  }

  // Static query methods
  static query(): any {
    if (!this.schema || !this.adapter || !this.dbInstance) {
      throw new Error("Model not properly initialized");
    }
    return this.dbInstance.from(this.schema.table);
  }

  static async find(filter?: Record<string, any>) {
    if (!this.schema || !this.adapter) {
      throw new Error("Model not properly initialized");
    }

    const builder = new QueryBuilder(this.schema.table);

    if (filter) {
      for (const [field, value] of Object.entries(filter)) {
        // Handle nested operators like { age: { $gt: 18 } }
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          for (const [op, opValue] of Object.entries(value)) {
            const operator = op === "$gt" ? "gt" : op === "$lt" ? "lt" : op === "$gte" ? "gte" : op === "$lte" ? "lte" : op === "$in" ? "in" : "eq";
            builder.where(field, operator as any, opValue);
          }
        } else {
          builder.where(field, "eq", value);
        }
      }
    }

    const query = builder.build();
    const results = await this.adapter.execute(query);

    return results.map((row: any) => this.hydrate(row));
  }

  static async findOne(filter: Record<string, any>) {
    const results = await this.find(filter);
    return results[0] || null;
  }

  static async findById(id: any) {
    return await this.findOne({ id });
  }

  static async create(data: Record<string, any>) {
    if (!this.schema || !this.adapter) {
      throw new Error("Model not properly initialized");
    }

    // Apply defaults and validate
    const dataWithDefaults = applyDefaults(data, this.schema.fields);
    const validated = this.schema.zodSchema.parse(dataWithDefaults);

    const builder = new QueryBuilder(this.schema.table);
    const query = builder.insert(validated).build();
    const result = await this.adapter.execute(query);

    return this.hydrate(validated);
  }

  static async update(filter: Record<string, any>, data: Record<string, any>) {
    if (!this.schema || !this.adapter) {
      throw new Error("Model not properly initialized");
    }

    // Validate update data
    const validated = this.schema.zodSchema.partial().parse(data);

    const builder = new QueryBuilder(this.schema.table);

    for (const [field, value] of Object.entries(filter)) {
      builder.where(field, "eq", value);
    }

    const query = builder.update(validated).build();
    await this.adapter.execute(query);

    return await this.find(filter);
  }

  static async delete(filter: Record<string, any>) {
    if (!this.schema || !this.adapter) {
      throw new Error("Model not properly initialized");
    }

    const builder = new QueryBuilder(this.schema.table);

    for (const [field, value] of Object.entries(filter)) {
      builder.where(field, "eq", value);
    }

    const query = builder.delete().build();
    return await this.adapter.execute(query);
  }

  static async deleteById(id: any) {
    return await this.delete({ id });
  }

  // Instance methods
  async save() {
    const ModelClass = this.constructor as typeof Model;
    if (!ModelClass.schema || !ModelClass.adapter) {
      throw new Error("Model not properly initialized");
    }

    const data = this.toJSON();
    const validated = ModelClass.schema.zodSchema.parse(data);

    // Check if this is an update (has id) or insert
    if (data.id !== undefined) {
      const builder = new QueryBuilder(ModelClass.schema.table);
      builder.where("id", "eq", data.id);
      const query = builder.update(validated).build();
      await ModelClass.adapter.execute(query);
    } else {
      const builder = new QueryBuilder(ModelClass.schema.table);
      const query = builder.insert(validated).build();
      await ModelClass.adapter.execute(query);
    }

    return this;
  }

  async delete() {
    const ModelClass = this.constructor as typeof Model;
    if (!ModelClass.schema || !ModelClass.adapter) {
      throw new Error("Model not properly initialized");
    }

    const data = this.toJSON();
    if (!data.id) {
      throw new Error("Cannot delete model without id");
    }

    return await ModelClass.deleteById(data.id);
  }

  toJSON(): Record<string, any> {
    const ModelClass = this.constructor as typeof Model;
    const json: Record<string, any> = {};
    if (!ModelClass.schema) return json;

    for (const field of Object.keys(ModelClass.schema.fields)) {
      if (this[field] !== undefined) {
        json[field] = this[field];
      }
    }

    return json;
  }

  // Hydrate database row into model instance
  static hydrate(row: Record<string, any>): Model {
    const instance = Object.create(this.prototype);
    Object.assign(instance, row);
    return instance;
  }
}
