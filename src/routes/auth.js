// src/routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt"); // 비밀번호 확인용
const jwt = require("jsonwebtoken"); // ★ 토큰 발급용 (추가됨)
const pool = require("../config/database");

const router = express.Router();

// 1. 회원가입 API (기존 코드)
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, nickname, phone, birth, gender } = req.body;

    // 이메일 중복 체크
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ message: "이미 가입된 이메일입니다." });
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // DB 저장
    const newUser = await pool.query(
      `INSERT INTO users (email, password, name, nickname, phone, birth, gender, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'USER') 
       RETURNING id, email, name, nickname`,
      [email, hashedPassword, name, nickname, phone, birth, gender]
    );

    res.status(201).json({ message: "회원가입 성공!", user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 에러 발생" });
  }
});

// 2. ★ 로그인 API (새로 추가된 부분)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // (1) 이메일이 존재하는지 확인
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    const user = userResult.rows[0];

    // (2) 비밀번호가 맞는지 확인 (암호화된 것끼리 비교)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    // (3) 정보가 맞으면 토큰(입장권) 발급!
    const token = jwt.sign(
      { id: user.id, email: user.email }, // 토큰 안에 담을 정보
      process.env.JWT_SECRET, // 우리만의 비밀 도장 (.env에 있는 것)
      { expiresIn: "1h" } // 유효기간: 1시간
    );

    // (4) 성공 응답 (토큰을 줌)
    res.json({
      message: "로그인 성공!",
      token: token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 에러" });
  }
});
// ... (위에는 로그인/회원가입 코드가 있음)

// ★ 추가할 부분: 문지기 불러오기
const authenticateToken = require("../middlewares/authenticateToken");

// ★ 내 정보 보기 API (로그인한 사람만 가능!)
// 주소: GET /api/auth/me
// 중간에 'authenticateToken'을 넣어서 검사를 시킵니다.
router.get("/me", authenticateToken, async (req, res) => {
  try {
    // 문지기가 통과시켜줬다면 req.user 안에 사용자 정보(id, email)가 들어있습니다.
    // 그걸 이용해서 DB에서 최신 정보를 다시 가져옵니다.
    const result = await pool.query(
      "SELECT id, email, name, nickname, role, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    res.json({
      message: "토큰 검증 성공! 회원 정보를 반환합니다.",
      user: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 에러" });
  }
});
module.exports = router;
