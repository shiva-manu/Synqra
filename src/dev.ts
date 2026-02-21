import { Synqra } from "./synqra.js";
// import { PostgresAdapter } from "./adapters/postgres.js";
import { MongoAdapter } from "./adapters/mongo.js";

const adapter=new MongoAdapter({
    uri:"mongodb://127.0.0.1:27017",
    database:"synqra",
})


const db=new Synqra(adapter);

await db.connect();


const users=await db
  .from("users")
  .where("age", "gt", 18)
  .orderBy("age", "desc")
  .limit(5)
  .find();
console.log(users);