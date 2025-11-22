const { Pool } = require("pg");
const url = require("url");

let pool;

function getPool() {
  if (!pool) {
    const { DATABASE_URL, PGSSLMODE } = process.env;

    if (!DATABASE_URL) {
      throw new Error("DATABASE_URL is not defined");
    }

    const useSSL = PGSSLMODE === "require";

    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
    });
  }

  return pool;
}

async function verifyConnection() {
  const { DATABASE_URL } = process.env;
  const parsed = DATABASE_URL ? new url.URL(DATABASE_URL) : null;
  const safe = parsed
    ? `${parsed.protocol}//${parsed.username ? "***" : ""}${parsed.username ? ":" : ""}${parsed.password ? "***@" : ""}${parsed.host}${parsed.pathname}`
    : "(undefined)";

  let client;

  try {
    client = await getPool().connect();
    await client.query("SELECT 1");
    console.log("✅ Database connected:", safe);
  } catch (e) {
    console.error("❌ DB connect failed:", e && (e.message || e));
    throw e;
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = {
  getPool,
  verifyConnection,
};
