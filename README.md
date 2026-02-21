# Synqra

A unified, type-safe database query builder and ORM for Node.js that works seamlessly with both MongoDB and PostgreSQL.

## Features

- 🔄 **Multi-Database Support** - Use the same API for MongoDB and PostgreSQL
- 🎯 **Type-Safe** - Built with TypeScript for better developer experience
- 📝 **Schema Abstraction** - Define models with validation and defaults
- 🔍 **Query Builder** - Fluent API for building complex queries
- ✅ **Validation** - Automatic schema validation using Zod
- 🚀 **Lightweight** - Minimal dependencies, maximum performance
- 🔒 **Transactions** - Support for database transactions

## Installation

```bash
npm install synqra@alpha
```

## Quick Start

### MongoDB Example

```typescript
import { Synqra, MongoAdapter } from "synqra";

const adapter = new MongoAdapter({
  uri: "mongodb://127.0.0.1:27017",
  database: "mydb",
});

const db = new Synqra(adapter);
await db.connect();

// Define a model
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

// Find users
const users = await User.find({ age: { $gt: 18 } });
const john = await User.findOne({ name: "John Doe" });

// Update
await User.update({ name: "John Doe" }, { age: 31 });

// Delete
await User.delete({ name: "John Doe" });
```

### PostgreSQL Example

```typescript
import { Synqra, PostgresAdapter } from "synqra";

const adapter = new PostgresAdapter({
  host: "localhost",
  port: 5432,
  database: "mydb",
  user: "postgres",
  password: "postgres",
});

const db = new Synqra(adapter);
await db.connect();

// Use the same API!
const User = db.model("User", {
  name: "string",
  age: "number",
});

const user = await User.create({
  name: "Jane Doe",
  age: 25,
});
```

## Query Builder API

You can also use the query builder directly without models:

```typescript
// SELECT with WHERE
const users = await db
  .from("users")
  .where("age", "gt", 18)
  .find();

// SELECT with LIMIT and ORDER BY
const sortedUsers = await db
  .from("users")
  .where("age", "gt", 18)
  .orderBy("age", "desc")
  .limit(10)
  .find();

// SELECT with projection
const names = await db
  .from("users")
  .select(["name", "age"])
  .find();

// INSERT
await db
  .from("users")
  .insert({
    name: "New User",
    age: 25,
  });

// UPDATE
await db
  .from("users")
  .where("name", "eq", "New User")
  .update({ age: 26 });

// DELETE
await db
  .from("users")
  .where("name", "eq", "New User")
  .delete();
```

## Schema Definition

### Field Types

Supported field types:
- `"string"` - String values
- `"number"` - Numeric values
- `"boolean"` - Boolean values
- `"date"` - Date values (accepts Date objects or ISO strings)
- `"object"` - Object/JSON values
- `"array"` - Array values

### Field Options

```typescript
const User = db.model("User", {
  // Required field (default)
  name: "string",
  
  // Optional field
  email: { type: "string", required: false },
  
  // Field with default value
  active: { type: "boolean", default: true },
  
  // Field with function default
  createdAt: { type: "date", default: () => new Date() },
});
```

## Model Methods

### Static Methods

- `Model.find(filter?)` - Find multiple records
- `Model.findOne(filter)` - Find a single record
- `Model.findById(id)` - Find by ID
- `Model.create(data)` - Create a new record
- `Model.update(filter, data)` - Update records
- `Model.delete(filter)` - Delete records
- `Model.deleteById(id)` - Delete by ID

### Instance Methods

- `model.save()` - Save the instance (insert or update)
- `model.delete()` - Delete the instance
- `model.toJSON()` - Serialize to JSON

```typescript
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
```

## Transactions

```typescript
await db.transaction(async (tx) => {
  const UserTx = tx.model("User", {
    name: "string",
    balance: "number",
  });

  const user1 = await UserTx.create({ name: "Alice", balance: 100 });
  const user2 = await UserTx.create({ name: "Bob", balance: 50 });

  // Transfer money
  await UserTx.update({ name: "Alice" }, { balance: 75 });
  await UserTx.update({ name: "Bob" }, { balance: 75 });
  
  // Transaction commits automatically on success
  // Rolls back on error
});
```

## Query Operators

Supported operators:
- `eq` - Equal
- `gt` - Greater than
- `lt` - Less than
- `gte` - Greater than or equal
- `lte` - Less than or equal
- `in` - In array

```typescript
// Using operators
const users = await User.find({ 
  age: { $gt: 18 },
  status: { $in: ["active", "pending"] }
});
```

## Adapters

### MongoAdapter

```typescript
import { MongoAdapter } from "synqra";

const adapter = new MongoAdapter({
  uri: "mongodb://127.0.0.1:27017",
  database: "mydb",
});
```

### PostgresAdapter

```typescript
import { PostgresAdapter } from "synqra";

const adapter = new PostgresAdapter({
  host: "localhost",
  port: 5432,
  database: "mydb",
  user: "postgres",
  password: "postgres",
});
```

## TypeScript Support

Synqra is built with TypeScript and provides full type safety:

```typescript
import { Synqra, MongoAdapter, Model } from "synqra";

const db = new Synqra(new MongoAdapter({ ... }));

// Type-safe model definition
const User = db.model("User", {
  name: "string",
  age: "number",
});

// Type-safe queries
const users: Model[] = await User.find();
```

## Examples

Check out the `examples/` directory for more examples:
- `mongo-example.ts` - MongoDB usage
- `postgres-example.ts` - PostgreSQL usage
- `query-builder-example.ts` - Query builder API
- `transaction-example.ts` - Transaction examples
- `model-example.ts` - Model usage examples

## Development

```bash
# Install dependencies
npm install

# Run development example
npm run dev

# Run tests
npm test
```

## License

ISC

## Version

**Current**: `0.1.0-alpha`

This is an alpha release. APIs may change before the stable release.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Roadmap

- [x] Query Builder API
- [x] Multi-database support (MongoDB, PostgreSQL)
- [x] Schema abstraction with validation
- [x] Model CRUD operations
- [x] Transactions
- [ ] Additional database adapters (MySQL, SQLite)
- [ ] Migrations
- [ ] Relationships (hasMany, belongsTo)
- [ ] Query optimization
- [ ] Connection pooling
- [ ] More validation options
