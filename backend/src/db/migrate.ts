import fs from "fs";
import path from "path";

import { pool } from "./pool";

async function runMigrations() {
  const migrationsDir = path.join(__dirname, "migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      const sql = fs.readFileSync(migrationPath, "utf8");
      await client.query(sql);
    }
    await client.query("COMMIT");
    console.log("Migrations completed");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((error: unknown) => {
  console.error("Migration failed", error);
  process.exit(1);
});
