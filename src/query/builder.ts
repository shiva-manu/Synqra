import { QueryAST, Condition, LogicalGroup, LogicalCondition, AggregationOp, Operator } from "../core/query.js";

export class QueryBuilder<T = any> {
  private table: string;
  private mode: "select" | "insert" | "update" | "delete" = "select";

  private conditions: Condition[] = [];
  private logicalGroups: LogicalGroup[] = [];
  private groupByFields?: string[];
  private aggregations?: AggregationOp[];
  private data?: Record<string, any>;
  private limitValue?: number;
  private offsetValue?: number;
  private orderByValue?: { field: string; direction: "asc" | "desc" };
  private selectFields?: string[];

  constructor(table: string) {
    this.table = table;
  }

  where<K extends keyof T & string>(field: K, operator: Operator, value: T[K] | any) {
    this.conditions.push({ field, operator, value });
    return this;
  }

  or(conditions: LogicalCondition[]) {
    this.logicalGroups.push({ type: "OR", conditions });
    return this;
  }

  and(conditions: LogicalCondition[]) {
    this.logicalGroups.push({ type: "AND", conditions });
    return this;
  }

  limit(n: number) {
    this.limitValue = n;
    return this;
  }

  offset(n: number) {
    this.offsetValue = n;
    return this;
  }

  paginate(page: number, pageSize: number) {
    this.limitValue = pageSize;
    this.offsetValue = (page - 1) * pageSize;
    return this;
  }

  orderBy<K extends keyof T & string>(field: K, direction: "asc" | "desc") {
    this.orderByValue = { field, direction };
    return this;
  }

  select<K extends keyof T & string>(fields: K[]) {
    this.selectFields = fields as string[];
    return this;
  }

  insert(data: Partial<T> | Record<string, any>) {
    this.mode = "insert";
    this.data = data;
    return this;
  }

  update(data: Partial<T> | Record<string, any>) {
    this.mode = "update";
    this.data = data;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  groupBy<K extends keyof T & string>(fields: K[]) {
    this.groupByFields = fields as string[];
    return this;
  }

  private aggregate(func: "count" | "sum" | "avg" | "min" | "max", field: string, alias?: string) {
    if (!this.aggregations) this.aggregations = [];
    this.aggregations.push({ function: func, field, alias });
    return this;
  }

  count<K extends keyof T & string>(field: K, alias?: string) {
    return this.aggregate("count", field, alias);
  }

  sum<K extends keyof T & string>(field: K, alias?: string) {
    return this.aggregate("sum", field, alias);
  }

  avg<K extends keyof T & string>(field: K, alias?: string) {
    return this.aggregate("avg", field, alias);
  }

  min<K extends keyof T & string>(field: K, alias?: string) {
    return this.aggregate("min", field, alias);
  }

  max<K extends keyof T & string>(field: K, alias?: string) {
    return this.aggregate("max", field, alias);
  }

  build(): QueryAST {
    return {
      type: this.mode,
      table: this.table,
      conditions: this.conditions.length ? this.conditions : undefined,
      logical: this.logicalGroups.length ? this.logicalGroups : undefined,
      groupBy: this.groupByFields,
      aggregations: this.aggregations?.length ? this.aggregations : undefined,
      data: this.data,
      limit: this.limitValue,
      offset: this.offsetValue,
      orderBy: this.orderByValue,
      select: this.selectFields,
    };
  }
}
