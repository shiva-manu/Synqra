import { z } from "zod";

export type FieldType = "string" | "number" | "boolean" | "date" | "object" | "array";

export type SchemaDefinition = {
  [field: string]: FieldType | { type: FieldType; default?: any; required?: boolean };
};

export type ModelSchema = {
  name: string;
  table: string;
  fields: SchemaDefinition;
  zodSchema: z.ZodObject<any>;
};

export type InferFieldType<T> = T extends "string"
  ? string
  : T extends "number"
  ? number
  : T extends "boolean"
  ? boolean
  : T extends "date"
  ? Date | string
  : T extends "object"
  ? Record<string, any>
  : T extends "array"
  ? any[]
  : T extends { type: "string" }
  ? string
  : T extends { type: "number" }
  ? number
  : T extends { type: "boolean" }
  ? boolean
  : T extends { type: "date" }
  ? Date | string
  : T extends { type: "object" }
  ? Record<string, any>
  : T extends { type: "array" }
  ? any[]
  : any;

export type InferSchemaType<S extends SchemaDefinition> = {
  [K in keyof S]: InferFieldType<S[K]>;
};

export function createZodSchema(definition: SchemaDefinition): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [field, fieldDef] of Object.entries(definition)) {
    let zodType: z.ZodTypeAny;
    let isRequired = true;

    // Handle both simple string type and object definition
    if (typeof fieldDef === "string") {
      zodType = mapTypeToZod(fieldDef);
    } else {
      zodType = mapTypeToZod(fieldDef.type);
      isRequired = fieldDef.required !== false;
    }

    if (!isRequired) {
      zodType = zodType.optional();
    }

    shape[field] = zodType;
  }

  return z.object(shape);
}

function mapTypeToZod(type: FieldType): z.ZodTypeAny {
  switch (type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "date":
      return z.date().or(z.string()); // Accept both Date objects and ISO strings
    case "object":
      return z.record(z.string(), z.any());
    case "array":
      return z.array(z.any());
    default:
      return z.any();
  }
}

export function applyDefaults(data: Record<string, any>, definition: SchemaDefinition): Record<string, any> {
  const result = { ...data };

  for (const [field, fieldDef] of Object.entries(definition)) {
    if (result[field] === undefined) {
      if (typeof fieldDef === "object" && fieldDef.default !== undefined) {
        result[field] = typeof fieldDef.default === "function"
          ? fieldDef.default()
          : fieldDef.default;
      }
    }
  }

  return result;
}
