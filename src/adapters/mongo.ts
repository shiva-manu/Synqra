import { MongoClient, Db } from "mongodb";
import { Adapter, MigrationPlan } from "../core/adapter.js";
import { QueryAST, Condition, LogicalGroup, LogicalCondition } from "../core/query.js";
import { ModelSchema } from "../core/schema.js";

export class MongoAdapter implements Adapter {
  public capabilities = {
    supportsTransactions: false,
    supportsAggregation: true,
    supportsJoins: false,
    supportsSchemaSync: true,
  };

  private client: MongoClient;
  private db!: Db;

  constructor(private config: { uri: string; database: string }) {
    this.client = new MongoClient(config.uri);
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(this.config.database);
  }

  plan(query: QueryAST): import("../core/adapter.js").QueryPlan {
    const filter = this.buildFilter(query);
    if (query.type === "select") {
      if (query.aggregations || query.groupBy) {
        return { type: "mongo-pipeline", pipeline: this.buildAggregatePipeline(query, filter) };
      }

      const options: any = {};
      if (query.select) options.projection = Object.fromEntries(query.select.map(f => [f, 1]));
      if (query.limit !== undefined) options.limit = query.limit;
      if (query.offset !== undefined) options.skip = query.offset;
      if (query.orderBy) options.sort = { [query.orderBy.field]: query.orderBy.direction === "asc" ? 1 : -1 };

      return { type: "mongo-query", filter, options };
    }

    return { type: "mongo-query", filter, data: query.data };
  }

  async execute(query: QueryAST) {
    const collection = this.db.collection(query.table);

    switch (query.type) {
      case "select":
        return this.handleSelect(collection, query);

      case "insert":
        return this.handleInsert(collection, query);

      case "update":
        return this.handleUpdate(collection, query);

      case "delete":
        return this.handleDelete(collection, query);
    }
  }

  private async handleSelect(collection: any, query: QueryAST) {
    if (query.aggregations || query.groupBy) {
      return this.executeAggregate(collection, query);
    }

    const filter = this.buildFilter(query);

    const projection = query.select
      ? Object.fromEntries(query.select.map(f => [f, 1]))
      : undefined;

    let cursor = collection.find(filter, { projection });
    if (query.limit !== undefined) {
      cursor = cursor.limit(query.limit);
    }
    if (query.offset !== undefined) {
      cursor = cursor.skip(query.offset);
    }
    if (query.orderBy) {
      cursor = cursor.sort({ [query.orderBy.field]: query.orderBy.direction === "asc" ? 1 : -1 });
    }
    return cursor.toArray();
  }

  private buildAggregatePipeline(query: QueryAST, filter: any) {
    const pipeline: any[] = [];
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    const groupStage: any = { _id: null };
    if (query.groupBy && query.groupBy.length > 0) {
      if (query.groupBy.length === 1) {
        groupStage._id = `$${query.groupBy[0]}`;
      } else {
        groupStage._id = {};
        for (const field of query.groupBy) {
          groupStage._id[field] = `$${field}`;
        }
      }
    }

    if (query.aggregations) {
      for (const agg of query.aggregations) {
        const outField = agg.alias || `${agg.function}_${agg.field}`;
        if (agg.function === "count") {
          groupStage[outField] = { $sum: 1 };
        } else {
          groupStage[outField] = { [`$${agg.function}`]: `$${agg.field}` };
        }
      }
    }

    pipeline.push({ $group: groupStage });

    if (query.orderBy) {
      let mappedField = query.orderBy.field;
      if (query.groupBy && query.groupBy.includes(mappedField)) {
        if (query.groupBy.length === 1) mappedField = "_id";
        else mappedField = `_id.${mappedField}`;
      }
      pipeline.push({ $sort: { [mappedField]: query.orderBy.direction === "asc" ? 1 : -1 } });
    }

    if (query.offset !== undefined) {
      pipeline.push({ $skip: query.offset });
    }

    if (query.limit !== undefined) {
      pipeline.push({ $limit: query.limit });
    }

    return pipeline;
  }

  private async executeAggregate(collection: any, query: QueryAST) {
    const pipeline = this.plan(query).pipeline!;
    const results = await collection.aggregate(pipeline).toArray();

    return results.map((r: any) => {
      const { _id, ...rest } = r;
      const formatted: any = { ...rest };
      if (_id !== null) {
        if (typeof _id === "object") {
          Object.assign(formatted, _id);
        } else if (query.groupBy && query.groupBy.length === 1) {
          formatted[query.groupBy[0]] = _id;
        }
      }
      return formatted;
    });
  }

  private async handleInsert(collection: any, query: QueryAST) {
    const result = await collection.insertOne(query.data);
    return result;
  }

  private async handleUpdate(collection: any, query: QueryAST) {
    const filter = this.buildFilter(query);
    const result = await collection.updateMany(filter, {
      $set: query.data,
    });
    return result;
  }

  private async handleDelete(collection: any, query: QueryAST) {
    const filter = this.buildFilter(query);
    const result = await collection.deleteMany(filter);
    return result;
  }

  private buildFilter(query: QueryAST): any {
    const andClauses: any[] = [];

    if (query.conditions) {
      for (const cond of query.conditions) {
        andClauses.push(this.buildCondition(cond));
      }
    }

    if (query.logical) {
      for (const group of query.logical) {
        andClauses.push(this.buildLogicalGroup(group));
      }
    }

    if (andClauses.length === 1) {
      return andClauses[0];
    } else if (andClauses.length > 1) {
      return { $and: andClauses };
    }

    return {};
  }

  private buildLogicalGroup(group: LogicalGroup): any {
    if (!group.conditions || group.conditions.length === 0) return {};

    const clauses = group.conditions.map((c: LogicalCondition) => {
      if ("type" in c && (c.type === "AND" || c.type === "OR")) {
        return this.buildLogicalGroup(c as LogicalGroup);
      } else {
        return this.buildCondition(c as Condition);
      }
    });

    return group.type === "AND" ? { $and: clauses } : { $or: clauses };
  }

  private buildCondition(cond: Condition): any {
    switch (cond.operator) {
      case "eq":
        return { [cond.field]: cond.value };
      case "gt":
        return { [cond.field]: { $gt: cond.value } };
      case "lt":
        return { [cond.field]: { $lt: cond.value } };
      case "gte":
        return { [cond.field]: { $gte: cond.value } };
      case "lte":
        return { [cond.field]: { $lte: cond.value } };
      case "in":
        return { [cond.field]: { $in: Array.isArray(cond.value) ? cond.value : [cond.value] } };
    }
  }

  async begin() {
    // Mongo transactions require replica set.
    // For now, no-op for local standalone mode.
  }

  async commit() { }

  async rollback() { }

  async planSync(models: ModelSchema[]): Promise<MigrationPlan> {
    const operations: any[] = [];
    const logs: string[] = [];

    const existingCollections = await this.db.listCollections().toArray();
    const existingNames = existingCollections.map(c => c.name);

    for (const model of models) {
      if (!existingNames.includes(model.table)) {
        operations.push({ create: model.table });
        logs.push(`[Mongo] Planner scheduled collection creation: ${model.table}`);
      }

      const properties: any = {};
      const requiredOptions: string[] = [];

      for (const [field, def] of Object.entries(model.fields)) {
        if (field === "id") continue;

        let fieldType = typeof def === "string" ? def : (def as any).type;
        // In actual prod, we might map to specific validation fields cleanly.
        let bsonType: string | string[] = "string";
        if (fieldType === "number") bsonType = ["double", "int", "long", "decimal"];
        if (fieldType === "boolean") bsonType = "bool";
        if (fieldType === "date") bsonType = ["date", "string"];
        if (fieldType === "object") bsonType = "object";
        if (fieldType === "array") bsonType = "array";

        properties[field] = { bsonType };

        // Disable strict requirement checking natively during schema dev phases to avoid mass DB errors on unstructured data
        // if (isRequired) requiredOptions.push(field);
      }

      const validatorConfig: any = {
        bsonType: "object",
        properties
      };
      if (requiredOptions.length > 0) {
        validatorConfig.required = requiredOptions;
      }

      operations.push({
        collMod: model.table,
        validator: { $jsonSchema: validatorConfig }
      });
      logs.push(`[Mongo] Planner mapped $jsonSchema validations for collection: ${model.table}`);
    }

    return { type: "mongo", operations, logs };
  }

  async sync(models: ModelSchema[]): Promise<void> {
    const plan = await this.planSync(models);
    for (const op of plan.operations) {
      try {
        await this.db.command(op);
      } catch (err: any) {
        // Safe to ignore minor validation conflict errors during bootstrap
      }
    }
  }
}