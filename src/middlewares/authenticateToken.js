// src/middlewares/authenticateToken.js
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  // 1. 프론트엔드가 보낸 헤더에서 토큰을 꺼냅니다.
  // 보통 "Bearer <토큰값>" 형태로 옵니다.
  const authHeader = req.headers["authorization"];

  // 🔍 [추가] 서버가 받은 헤더를 터미널에 찍어보자!
  console.log("--------------------------------");
  console.log("1. 받은 헤더 내용:", authHeader);

  // Bearer와 토큰을 분리
  const token = authHeader && authHeader.split(" ")[1];

  // 🔍 [추가] 분리된 토큰도 찍어보자!
  console.log("2. 추출된 토큰:", token);
  console.log("--------------------------------");

  // 2. 토큰이 없으면? "돌아가세요(401)"
  if (!token) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  // 3. 토큰이 위조되었거나 만료되었는지 확인
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "유효하지 않은 토큰입니다." });
    }

    // 4. 통과! (req.user에 사용자 정보를 담아서 다음 단계로 보냄)
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
