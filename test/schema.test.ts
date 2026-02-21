import { describe, it, expect } from "vitest";
import { createZodSchema, applyDefaults } from "../src/core/schema.js";

describe("Schema", () => {
  describe("createZodSchema", () => {
    it("should create a Zod schema from simple field definitions", () => {
      const definition = {
        name: "string",
        age: "number",
        active: "boolean",
      };

      const schema = createZodSchema(definition);
      const result = schema.parse({ name: "John", age: 30, active: true });

      expect(result.name).toBe("John");
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
    });

    it("should handle optional fields", () => {
      const definition = {
        name: "string",
        email: { type: "string", required: false },
      };

      const schema = createZodSchema(definition);
      const result = schema.parse({ name: "John" });

      expect(result.name).toBe("John");
      expect(result.email).toBeUndefined();
    });

    it("should validate field types", () => {
      const definition = {
        name: "string",
        age: "number",
      };

      const schema = createZodSchema(definition);

      expect(() => schema.parse({ name: 123, age: 30 })).toThrow();
      expect(() => schema.parse({ name: "John", age: "30" })).toThrow();
    });
  });

  describe("applyDefaults", () => {
    it("should apply default values", () => {
      const definition = {
        name: "string",
        active: { type: "boolean", default: true },
        count: { type: "number", default: 0 },
      };

      const data = { name: "John" };
      const result = applyDefaults(data, definition);

      expect(result.name).toBe("John");
      expect(result.active).toBe(true);
      expect(result.count).toBe(0);
    });

    it("should not override existing values", () => {
      const definition = {
        name: "string",
        active: { type: "boolean", default: true },
      };

      const data = { name: "John", active: false };
      const result = applyDefaults(data, definition);

      expect(result.active).toBe(false);
    });

    it("should handle function defaults", () => {
      const definition = {
        name: "string",
        createdAt: { type: "date", default: () => new Date("2024-01-01") },
      };

      const data = { name: "John" };
      const result = applyDefaults(data, definition);

      expect(result.name).toBe("John");
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });
});
