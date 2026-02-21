import { Synqra } from "../synqra.js";
import { MongoAdapter } from "../adapters/mongo.js";
import { PostgresAdapter } from "../adapters/postgres.js";

// Example: Using transactions with MongoDB
async function mongoTransactionExample() {
  const adapter = new MongoAdapter({
    uri: "mongodb://127.0.0.1:27017",
    database: "synqra",
  });

  const db = new Synqra(adapter);
  await db.connect();

  const User = db.model("User", {
    name: "string",
    age: "number",
    balance: "number",
  });

  console.log("=== MongoDB Transaction Example ===");

  try {
    await db.transaction(async (tx) => {
      const UserTx = tx.model("User", {
        name: "string",
        age: "number",
        balance: "number",
      });

      // Create user
      const user1 = await UserTx.create({
        name: "Alice",
        age: 30,
        balance: 100,
      });

      // Create another user
      const user2 = await UserTx.create({
        name: "Bob",
        age: 25,
        balance: 50,
      });

      // Transfer money (simulated)
      await UserTx.update({ name: "Alice" }, { balance: 75 });
      await UserTx.update({ name: "Bob" }, { balance: 75 });

      console.log("Transaction completed successfully");
    });
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

// Example: Using transactions with PostgreSQL
async function postgresTransactionExample() {
  const adapter = new PostgresAdapter({
    host: "localhost",
    port: 5432,
    database: "synqra",
    user: "postgres",
    password: "postgres",
  });

  const db = new Synqra(adapter);
  await db.connect();

  const User = db.model("User", {
    name: "string",
    age: "number",
    balance: "number",
  });

  console.log("\n=== PostgreSQL Transaction Example ===");

  try {
    await db.transaction(async (tx) => {
      const UserTx = tx.model("User", {
        name: "string",
        age: "number",
        balance: "number",
      });

      // Create user
      const user1 = await UserTx.create({
        name: "Charlie",
        age: 28,
        balance: 200,
      });

      // Create another user
      const user2 = await UserTx.create({
        name: "Diana",
        age: 32,
        balance: 150,
      });

      // Transfer money (simulated)
      await UserTx.update({ name: "Charlie" }, { balance: 175 });
      await UserTx.update({ name: "Diana" }, { balance: 175 });

      console.log("Transaction completed successfully");
    });
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

// Run examples
async function main() {
  try {
    await mongoTransactionExample();
  } catch (err) {
    console.error("MongoDB transaction example error:", err);
  }

  try {
    await postgresTransactionExample();
  } catch (err) {
    console.error("PostgreSQL transaction example error:", err);
  }
}

main().catch(console.error);
