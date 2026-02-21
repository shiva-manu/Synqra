export type Operator =
  | "eq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "in";

export type Condition = {
  field: string;
  operator: Operator;
  value: any;
};

export type LogicalCondition = Condition | LogicalGroup;

export type LogicalGroup = {
  type: "AND" | "OR";
  conditions: LogicalCondition[];
};

export type AggregationOp = {
  function: "count" | "sum" | "avg" | "min" | "max";
  field: string;
  alias?: string;
};

export type QueryAST = {
  type: "select" | "insert" | "update" | "delete";
  table: string;

  conditions?: Condition[];
  logical?: LogicalGroup[];

  groupBy?: string[];
  aggregations?: AggregationOp[];

  data?: Record<string, any>;

  limit?: number;
  offset?: number;
  orderBy?: {
    field: string;
    direction: "asc" | "desc";
  };

  select?: string[]; // projection
};