// db.js 파일 내용
const { Pool } = require("pg");
require("dotenv").config(); // .env에서 비밀번호 꺼내오기

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Render 외부 접속 시 필수 옵션
  },
});

// 잘 연결됐는지 테스트하는 코드
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ 연결 실패! 에러 내용을 확인하세요:", err.stack);
  } else {
    console.log("✅ DB 연결 성공! 이제 코드로 DB를 조작할 수 있습니다.");
    release(); // 연결 종료
  }
});

module.exports = pool;
