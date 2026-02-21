import { Synqra } from "../synqra.js";
import { MongoAdapter } from "../adapters/mongo.js";

// Example demonstrating Phase B - Schema Abstraction
async function main() {
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
    createdAt: { type: "date", default: () => new Date() },
  });

  // Create a user - validation and defaults are applied automatically
  const user = await User.create({
    name: "John Doe",
    age: 30,
    email: "john@example.com",
  });

  console.log("Created user:", user);
  console.log("User active (default):", user.active);
  console.log("User createdAt (default):", user.createdAt);

  // Find users with filter
  const adults = await User.find({ age: { $gt: 18 } });
  console.log("Adults:", adults);

  // Find one user
  const john = await User.findOne({ name: "John Doe" });
  console.log("Found user:", john);

  // Update user
  const updated = await User.update({ name: "John Doe" }, { age: 31 });
  console.log("Updated users:", updated);

  // Create instance and use instance methods
  const jane = new User({
    name: "Jane Doe",
    age: 25,
    email: "jane@example.com",
  });

  await jane.save();
  console.log("Saved Jane:", jane);

  jane.age = 26;
  await jane.save();
  console.log("Updated Jane:", jane);

  // Delete user
  await User.delete({ name: "John Doe" });
  console.log("Deleted John");
}

main().catch(console.error);
