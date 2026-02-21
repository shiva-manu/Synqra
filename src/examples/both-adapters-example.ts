import { Synqra } from "../synqra.js";
import { MongoAdapter } from "../adapters/mongo.js";
import { PostgresAdapter } from "../adapters/postgres.js";

// Example showing how to use the same code with different adapters
async function exampleWithMongo() {
  console.log("\n=== Using MongoDB Adapter ===");
  
  const mongoAdapter = new MongoAdapter({
    uri: "mongodb://127.0.0.1:27017",
    database: "synqra",
  });

  const db = new Synqra(mongoAdapter);
  await db.connect();

  const User = db.model("User", {
    name: "string",
    age: "number",
    email: "string",
  });

  const user = await User.create({
    name: "Mongo User",
    age: 25,
    email: "mongo@example.com",
  });

  console.log("Created in MongoDB:", user);
}

async function exampleWithPostgres() {
  console.log("\n=== Using PostgreSQL Adapter ===");
  
  const postgresAdapter = new PostgresAdapter({
    host: "localhost",
    port: 5432,
    database: "synqra",
    user: "postgres",
    password: "postgres",
  });

  const db = new Synqra(postgresAdapter);
  await db.connect();

  const User = db.model("User", {
    name: "string",
    age: "number",
    email: "string",
  });

  const user = await User.create({
    name: "Postgres User",
    age: 30,
    email: "postgres@example.com",
  });

  console.log("Created in PostgreSQL:", user);
}

// Run examples
async function main() {
  try {
    await exampleWithMongo();
  } catch (err) {
    console.error("MongoDB example error:", err);
  }

  try {
    await exampleWithPostgres();
  } catch (err) {
    console.error("PostgreSQL example error:", err);
  }
}

main().catch(console.error);
