import fs from "node:fs/promises";
import path from "node:path";

const dbPath = path.resolve("data/store.json");

const initialState = {
  invitations: [],
  orders: []
};

async function ensureDb() {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(initialState, null, 2));
  }
}

export async function readStore() {
  await ensureDb();
  const raw = await fs.readFile(dbPath, "utf8");
  return JSON.parse(raw);
}

export async function writeStore(store) {
  await ensureDb();
  const tmpPath = `${dbPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(store, null, 2));
  await fs.rename(tmpPath, dbPath);
}

export async function updateStore(mutator) {
  const store = await readStore();
  const result = await mutator(store);
  await writeStore(store);
  return result;
}

