// src/routes/auth.js (DB 변경사항 반영)
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const authenticateToken = require("../middlewares/authenticateToken");

const router = express.Router();

// 1. 회원가입
// src/routes/auth.js (수정본)
router.post("/register", async (req, res) => {
  try {
    // 1. 요청 데이터 받기
    const { email, password, name, nickname, phone, birth, gender } = req.body;

    // 🔍 [디버깅] 들어온 데이터가 뭔지 터미널에 찍어보기 (문제 해결의 열쇠!)
    console.log("회원가입 요청 데이터:", req.body);

    // 2. 안전장치: 필수 정보가 없으면 에러 내보내기 (여기서 막아줌!)
    if (!email || !password || !name || !nickname) {
      return res
        .status(400)
        .json({ message: "이메일, 비밀번호, 이름, 닉네임은 필수입니다." });
    }

    // 3. 중복 체크
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ message: "이미 가입된 이메일입니다." });
    }

    // 4. 비밀번호 암호화 (이제 password가 확실히 있으니까 에러 안 남)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. 유저 테이블 저장
    const newUser = await pool.query(
      `INSERT INTO users (email, password, name, nickname, phone, birth, gender, role, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'USER', 'ACTIVE') 
       RETURNING id, email, name, nickname`,
      [email, hashedPassword, name, nickname, phone, birth, gender]
    );

    const userId = newUser.rows[0].id;

    // 6. 프로필 테이블 생성
    await pool.query(`INSERT INTO profiles (user_id) VALUES ($1)`, [userId]);

    res.status(201).json({ message: "회원가입 성공!", user: newUser.rows[0] });
  } catch (err) {
    console.error("회원가입 에러:", err); // 에러 내용을 더 자세히 출력
    res.status(500).json({ message: "서버 에러 발생" });
  }
});

// 2. 로그인 (변경 없음)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
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
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    // 토큰 발급
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "로그인 성공!",
      token,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 3. 내 정보 보기 (프로필 정보까지 같이 가져오기)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    // users 테이블과 profiles 테이블을 합쳐서(JOIN) 가져옴
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.nickname, u.role, 
              p.bio, p.level, p.region, p.interests, p.image_url
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    res.json({ message: "회원 정보 조회 성공", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 에러" });
  }
});

module.exports = router;
