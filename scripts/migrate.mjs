import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

let url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!url) {
  console.error("No POSTGRES_URL found in .env.local");
  process.exit(1);
}
url = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
const sql = readFileSync(join(root, "supabase", "schema.sql"), "utf8");
await client.query(sql);
const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema='public' order by 1"
);
console.log("public tables:", rows.map((r) => r.table_name).join(", "));
await client.end();
