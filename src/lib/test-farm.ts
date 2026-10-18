import { db } from "./db";

async function run() {
  try {
    const users = await db.user.findMany({});
    console.log("All Users:", JSON.stringify(users.map(u => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role })), null, 2));

    const farms = await db.farm.findMany({});
    console.log("All Farms:", JSON.stringify(farms.map(f => ({ id: f.id, name: f.name, ownerId: f.ownerId })), null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

run();
