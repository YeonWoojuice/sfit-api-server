// src/routes/clubs.js (최종_최종_진짜최종.js)
const express = require("express");
const pool = require("../config/database");
const authenticateToken = require("../middlewares/authenticateToken");

const router = express.Router();

// 1. 동호회 만들기 (POST)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, description, region, sport, max_members } = req.body;
    const ownerId = req.user.id;

    if (!name || !region || !sport) {
      return res
        .status(400)
        .json({ message: "이름, 지역, 종목은 필수입니다." });
    }

    const newClub = await pool.query(
      `INSERT INTO clubs (name, description, region, sport, max_members, owner_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, description, region, sport, max_members || 50, ownerId]
    );

    res.status(201).json({
      message: "동호회가 개설되었습니다!",
      club: newClub.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 에러 발생" });
  }
});

// src/routes/clubs.js (목록 조회 부분 수정)

// 2. 동호회 목록 보기 (검색 필터 추가!)
// 사용법: GET /api/clubs?region=서울&sport=축구
router.get("/", async (req, res) => {
  try {
    // 1. 주소창(Query)에서 검색어 꺼내기
    const { region, sport } = req.query;

    // 2. 기본 쿼리 (조건이 없을 때)
    let sql = "SELECT * FROM clubs";
    let params = [];
    let conditions = [];

    // 3. 조건이 있으면 SQL 문장 조립하기
    if (region) {
      params.push(region);
      conditions.push(`region = $${params.length}`); // $1, $2... 자동 생성
    }
    if (sport) {
      params.push(sport);
      conditions.push(`sport = $${params.length}`);
    }

    // 조건이 하나라도 있으면 WHERE 붙이기
    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    // 정렬 추가
    sql += " ORDER BY created_at DESC";

    // 4. DB에 요청
    const result = await pool.query(sql, params);

    res.json({
      count: result.rows.length,
      clubs: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "목록 조회 실패" });
  }
});

// 3. 동호회 상세 조회 (GET)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM clubs WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "존재하지 않는 동호회입니다." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "조회 중 에러 발생" });
  }
});

// ★ 4. 동호회 가입하기 (POST) - 여기 있는지 확인하세요!
router.post("/:id/join", authenticateToken, async (req, res) => {
  try {
    const clubId = req.params.id;
    const userId = req.user.id;

    // (1) 이미 가입했는지 확인
    const checkMember = await pool.query(
      "SELECT * FROM club_members WHERE club_id = $1 AND user_id = $2",
      [clubId, userId]
    );

    if (checkMember.rows.length > 0) {
      return res.status(409).json({ message: "이미 가입된 동호회입니다." });
    }

    // (2) 가입 처리
    await pool.query(
      `INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, 'MEMBER')`,
      [clubId, userId]
    );

    res.status(200).json({ message: "가입 성공! 환영합니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "가입 처리 중 에러가 발생했습니다." });
  }
});

module.exports = router;
