// src/app.js (최종 완성본)
const express = require("express");
const cors = require("cors");
const pool = require("./config/database");

// 라우터 파일들 불러오기
const routes = require("./routes/index");

const createApp = () => {

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static('uploads')); // Serve uploaded files statically
  app.use('/images', express.static('images'));  // 이미지 폴더 정적 파일 제공

  // 헬스 체크
  app.get("/", (req, res) => {
    res.send("✅ Club Forge 서버가 정상 작동 중입니다!");
  });

  // API 라우터 연결
  app.use("/api", routes);

  return app;
};

module.exports = createApp;
// 배포 테스트용 주석 추가
