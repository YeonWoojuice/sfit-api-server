require("dotenv").config();

const http = require("http");
const createApp = require("./app"); // app 생성 함수
const { getpool, verifyConnection } = require("./config/database"); // pool + verify 가져오기

const port = process.env.PORT || 4000;
const app = createApp();
const server = http.createServer(app);

// ✅ DB 헬스체크 엔드포인트: 여기 추가해두면 됨
app.get("/health/db", async (req, res) => {
  try {
    const pool = getpool();
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

// 🔥 서버 시작 로직
async function start() {
  try {
    if (process.env.DATABASE_URL) {
      console.log("Using DATABASE_URL from environment");
      await verifyConnection(); // 여기서 한 번 실제로 DB 접속 확인
    } else {
      console.warn(
        "DATABASE_URL is not defined. Server will start, but database features are disabled until it is set."
      );
    }

    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

start();
