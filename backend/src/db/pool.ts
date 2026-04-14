import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to backend/.env");
}

const isCloudPostgres =
  process.env.DATABASE_URL.includes("neon.tech") ||
  process.env.DATABASE_URL.includes("sslmode=require") ||
  process.env.DATABASE_URL.includes("sslmode=verify-full");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isCloudPostgres ? { rejectUnauthorized: false } : false,
});

export { pool };
