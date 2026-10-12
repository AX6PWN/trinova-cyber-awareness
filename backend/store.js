/* ============================================================
   CYBERSAFE 360° — SHARED DATA STORE
   One durable copy of the JSON datastore in Neon Postgres so
   every serverless instance sees the same users/data. Falls back
   to the local JSON file for single-process development.

   Usage (server.js):
     await store.run(() => handleApi(req, res, url));

   `store.run` loads the datastore for the request, exposes it to
   the synchronous db.js helpers via AsyncLocalStorage, and writes
   it back to Neon (before the request completes) when mutated.
   ============================================================ */

const { AsyncLocalStorage } = require('async_hooks');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SEED_FILE = path.join(DATA_DIR, 'cybersafe_db.json');
const TMP_FILE = '/tmp/cybersafe_db.json';

const DATABASE_URL = process.env.DATABASE_URL || '';
const IS_VERCEL = Boolean(process.env.VERCEL);

let neonSql = null;
if (DATABASE_URL && DATABASE_URL.startsWith('postgres')) {
  try {
    const { neon } = require('@neondatabase/serverless');
    neonSql = neon(DATABASE_URL);
  } catch (err) {
    console.warn('[Store] Neon driver unavailable; using local JSON store:', err.message);
    neonSql = null;
  }
}

function getBackend() {
  return neonSql ? 'neon' : 'file';
}

const als = new AsyncLocalStorage();

/* ------------------------------------------------------------
   NEON TABLE (single-row JSON blob)
   ------------------------------------------------------------ */

let schemaReady = null;
function ensureSchema() {
  if (!neonSql) return Promise.resolve();
  if (!schemaReady) {
    schemaReady = neonSql.query(
      `CREATE TABLE IF NOT EXISTS app_state (
         id         TEXT PRIMARY KEY,
         data       JSONB NOT NULL,
         updated_at BIGINT NOT NULL
       )`
    ).catch(err => {
      schemaReady = null; // allow the next request to retry
      throw err;
    });
  }
  return schemaReady;
}

async function loadFromNeon() {
  await ensureSchema();
  const rows = await neonSql.query(`SELECT data FROM app_state WHERE id = 'main'`);
  const row = rows && rows[0];
  if (row && row.data) return row.data;
  return null;
}

async function saveToNeon(data) {
  await ensureSchema();
  await neonSql.query(
    `INSERT INTO app_state (id, data, updated_at)
     VALUES ('main', $1::jsonb, $2)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
    [JSON.stringify(data), Date.now()]
  );
}

/* ------------------------------------------------------------
   LOCAL FILE FALLBACK
   ------------------------------------------------------------ */

function readSeed() {
  try {
    if (fs.existsSync(SEED_FILE)) {
      return JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('[Store] Failed reading seed file:', err.message);
  }
  return null;
}

function writeFile(data) {
  const target = IS_VERCEL ? TMP_FILE : SEED_FILE;
  try {
    if (!IS_VERCEL && !fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn('[Store] Local write failed:', err.message);
    return false;
  }
}

/** Load the datastore (Neon when configured, else the local file). */
async function load() {
  if (neonSql) {
    try {
      const data = await loadFromNeon();
      if (data) return data;
      // First run against this database: seed from the committed JSON.
      const seed = readSeed();
      if (seed) {
        await saveToNeon(seed);
        return seed;
      }
      return null;
    } catch (err) {
      console.warn('[Store] Neon load failed; falling back to local file:', err && err.name);
    }
  }
  return readSeed();
}

/** Persist the datastore to its durable backend. */
async function persist(data) {
  if (neonSql) {
    try {
      await saveToNeon(data);
      return true;
    } catch (err) {
      console.warn('[Store] Neon persist failed; writing local copy:', err && err.name);
    }
  }
  return writeFile(data);
}

/* ------------------------------------------------------------
   REQUEST-SCOPED ACCESS (sync helpers for db.js)
   ------------------------------------------------------------ */

/** Current request's datastore (or the seed file outside a request). */
function get() {
  const ctx = als.getStore();
  if (ctx) return ctx.data;
  return readSeed();
}

/** Replace the current request's datastore; marks it for persistence. */
function set(data) {
  const ctx = als.getStore();
  if (ctx) {
    ctx.data = data;
    ctx.dirty = true;
    return;
  }
  writeFile(data);
}

/**
 * Run a request handler against the shared datastore. Loads before the
 * handler and (if mutated) persists before the returned promise settles,
 * so the durable write is always complete before the response is done.
 */
async function run(handler) {
  const data = await load();
  const ctx = { data, dirty: false };
  return als.run(ctx, async () => {
    try {
      return await handler();
    } finally {
      if (ctx.dirty) {
        try {
          await persist(ctx.data);
        } catch (err) {
          console.error('[Store] Failed to persist datastore:', err && err.message);
        }
      }
    }
  });
}

module.exports = { run, get, set, load, persist, getBackend };
