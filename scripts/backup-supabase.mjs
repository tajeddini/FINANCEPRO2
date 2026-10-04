import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const apiKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !apiKey) {
  throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local or the environment.");
}

const tables = [
  { name: "financepro_state", orderBy: "id" },
  { name: "fp_users", orderBy: "username" },
];
const pageSize = 1000;
const restBase = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1`;
const headers = {
  apikey: apiKey,
  Authorization: `Bearer ${apiKey}`,
  Accept: "application/json",
  Prefer: "count=exact",
  "Range-Unit": "items",
};

async function fetchAllRows({ name, orderBy }) {
  const rows = [];
  let offset = 0;

  while (true) {
    const url = new URL(`${restBase}/${name}`);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", `${orderBy}.asc`);

    const response = await fetch(url, {
      headers: { ...headers, Range: `${offset}-${offset + pageSize - 1}` },
    });
    if (!response.ok) {
      throw new Error(`Reading ${name} failed with HTTP ${response.status}. No backup was reported as complete.`);
    }

    const page = await response.json();
    if (!Array.isArray(page)) throw new Error(`Unexpected response while reading ${name}.`);
    const contentRange = response.headers.get("content-range") ?? "";
    const totalMatch = contentRange.match(/\/(\d+|\*)$/);
    const total = totalMatch && totalMatch[1] !== "*" ? Number(totalMatch[1]) : null;
    rows.push(...page);

    if (total !== null) {
      if (rows.length >= total) break;
      if (page.length === 0) throw new Error(`Pagination stopped before all ${name} rows were fetched.`);
    } else if (page.length < pageSize) {
      break;
    }

    offset += page.length;
  }

  return rows;
}

const backupDir = resolve(process.cwd(), "backups");
await mkdir(backupDir, { recursive: true, mode: 0o700 });
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const results = [];

for (const table of tables) {
  const rows = await fetchAllRows(table);
  const filePath = resolve(backupDir, `backup-${table.name}-${timestamp}.json`);
  await writeFile(filePath, `${JSON.stringify(rows, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  results.push({ table: table.name, rows: rows.length, file: filePath });
}

console.log(JSON.stringify({ exported: results }, null, 2));