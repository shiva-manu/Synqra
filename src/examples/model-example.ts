import { Synqra } from "../synqra.js";
import { MongoAdapter } from "../adapters/mongo.js";
import { PostgresAdapter } from "../adapters/postgres.js";
import { Model } from "../core/model.js";

// Example: Using db.model() to define a schema
async function example1() {
  const adapter = new MongoAdapter({
    uri: "mongodb://127.0.0.1:27017",
    database: "synqra",
  });

  const db = new Synqra(adapter);
  await db.connect();

  // Define a User model with schema
  const User = db.model("User", {
    name: "string",
    age: "number",
    email: { type: "string", required: false },
    active: { type: "boolean", default: true },
  });

  // Create a user
  const user = await User.create({
    name: "John Doe",
    age: 30,
    email: "john@example.com",
  });

  console.log("Created user:", user);

  // Find users
  const users = await User.find({ age: { $gt: 18 } });
  console.log("Users:", users);

  // Find one user
  const john = await User.findOne({ name: "John Doe" });
  console.log("Found user:", john);

  // Update user
  await User.update({ name: "John Doe" }, { age: 31 });
  
  // Delete user
  await User.delete({ name: "John Doe" });
}

// Example: Extending Model class
class User extends Model {
  // You can add custom methods
  getFullName() {
    return `${this.name} (${this.email})`;
  }

  isAdult() {
    return this.age >= 18;
  }
}

async function example2() {
  const adapter = new MongoAdapter({
    uri: "mongodb://127.0.0.1:27017",
    database: "synqra",
  });

  const db = new Synqra(adapter);
  await db.connect();

  // Register the schema
  const UserModel = db.model("User", {
    name: "string",
    age: "number",
    email: "string",
  });

  // Now you can use UserModel with all the static methods
  const users = await UserModel.find();
  const user = await UserModel.create({
    name: "Jane Doe",
    age: 25,
    email: "jane@example.com",
  });

  console.log("User instance:", user);
}

// Example: Using instance methods
async function example3() {
  const adapter = new MongoAdapter({
    uri: "mongodb://127.0.0.1:27017",
    database: "synqra",
  });

  const db = new Synqra(adapter);
  await db.connect();

  const User = db.model("User", {
    name: "string",
    age: "number",
  });

  // Create instance
  const user = new User({
    name: "Bob",
    age: 28,
  });

  // Save to database
  await user.save();

  // Update and save
  user.age = 29;
  await user.save();

  // Delete
  await user.delete();
}

// Example: Using PostgreSQL adapter
async function example4() {
  const adapter = new PostgresAdapter({
    host: "localhost",
    port: 5432,
    database: "synqra",
    user: "postgres",
    password: "postgres",
  });

  const db = new Synqra(adapter);
  await db.connect();

  // Define a User model with schema
  const User = db.model("User", {
    name: "string",
    age: "number",
    email: { type: "string", required: false },
    active: { type: "boolean", default: true },
  });

  // Create a user
  const user = await User.create({
    name: "Postgres User",
    age: 30,
    email: "postgres@example.com",
  });

  console.log("Created user (PostgreSQL):", user);

  // Find users
  const users = await User.find({ age: { $gt: 18 } });
  console.log("Users (PostgreSQL):", users);

  // Find one user
  const found = await User.findOne({ name: "Postgres User" });
  console.log("Found user (PostgreSQL):", found);

  // Update user
  await User.update({ name: "Postgres User" }, { age: 31 });
  
  // Delete user
  await User.delete({ name: "Postgres User" });
}
