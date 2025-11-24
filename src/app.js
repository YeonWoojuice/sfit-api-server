// src/app.js (최종 완성본)
const express = require("express");
const cors = require("cors");
const pool = require("./config/database");

// 라우터 파일들 불러오기
const authRoutes = require("./routes/auth");
const clubRoutes = require("./routes/clubs"); // ★ 여기 있는지 확인!
const flashRoutes = require("./routes/flashes");

const createApp = () => {

  const app = express();

  app.use(cors());
  app.use(express.json());

  // 헬스 체크
  app.get("/", (req, res) => {
    res.send("✅ Club Forge 서버가 정상 작동 중입니다!");
  });

  // API 라우터 연결 (순서 중요!)
  app.use("/api/auth", authRoutes);
  app.use("/api/clubs", clubRoutes);
  app.use("/api/flashes", flashRoutes);

  return app;
};

module.exports = createApp;
// 배포 테스트용 주석 추가
