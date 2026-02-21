import { Synqra } from "../synqra.js";
import { MongoAdapter } from "../adapters/mongo.js";
// import { PostgresAdapter } from "../adapters/postgres.js";

// Example: Using the query builder directly (without models)
async function queryBuilderExample() {
  const adapter = new MongoAdapter({
    uri: "mongodb://127.0.0.1:27017",
    database: "synqra",
  });

  const db = new Synqra(adapter);
  await db.connect();

  console.log("=== Query Builder Examples ===");

  // SELECT with WHERE
  const users = await db
    .from("users")
    .where("age", "gt", 18)
    .find();
  console.log("Users over 18:", users);

  // SELECT with LIMIT
  const limitedUsers = await db
    .from("users")
    .where("age", "gt", 18)
    .limit(10)
    .find();
  console.log("First 10 users over 18:", limitedUsers);

  // SELECT with ORDER BY
  const sortedUsers = await db
    .from("users")
    .where("age", "gt", 18)
    .orderBy("age", "desc")
    .find();
  console.log("Users sorted by age:", sortedUsers);

  // SELECT with SELECT (projection)
  const projectedUsers = await db
    .from("users")
    .select(["name", "age"])
    .where("age", "gt", 18)
    .find();
  console.log("Users with only name and age:", projectedUsers);

  // INSERT
  const insertResult = await db
    .from("users")
    .insert({
      name: "Query Builder User",
      age: 25,
      email: "qb@example.com",
    });
  console.log("Insert result:", insertResult);

  // UPDATE
  const updateResult = await db
    .from("users")
    .where("name", "eq", "Query Builder User")
    .update({ age: 26 });
  console.log("Update result:", updateResult);

  // DELETE
  const deleteResult = await db
    .from("users")
    .where("name", "eq", "Query Builder User")
    .delete();
  console.log("Delete result:", deleteResult);
}

queryBuilderExample().catch(console.error);
