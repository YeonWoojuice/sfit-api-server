require("dotenv").config();

const http = require("http");
const url = require("url");
const createApp = require("./app");
const pool = require("./config/database");

const port = process.env.PORT || 4000;
const app = createApp();
const server = http.createServer(app);

// 기본 헬스 체크
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// DB 헬스 체크
app.get("/health/db", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT 1 AS ok");
    return res.json({
      status: "ok",
      db: rows[0].ok === 1 ? "connected" : "weird",
    });
  } catch (err) {
    console.error("DB health error:", err.message);
    return res.status(500).json({
      status: "error",
      db: "disconnected",
      message: err.message,
    });
  }
});

async function start() {
  try {
    if (process.env.DATABASE_URL) {
      const parsed = new url.URL(process.env.DATABASE_URL);
      const safe = `${parsed.protocol}//${parsed.username ? "***" : ""}${parsed.username ? ":" : ""
        }${parsed.password ? "***@" : ""}${parsed.host}${parsed.pathname}`;

      console.log("Using DATABASE_URL from environment:", safe);
    } else {
      console.warn(
        "DATABASE_URL is not defined. Server will start, but database features are disabled until it is set."
      );
    }

    server
      .once("error", (err) => {
        console.error("[listen error]", err?.message || err);
        process.exit(1);
      })
      .listen(port, "0.0.0.0", () => {
        console.log(`Server running on port ${port}`);
      });
  } catch (error) {
    console.error("Failed to start server:", error?.message || error);
    process.exit(1);
  }
}

start();
