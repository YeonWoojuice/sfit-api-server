const express = require("express");
const { getPool } = require("../config/database");
const authenticateToken = require("../middlewares/authenticateToken");

const router = express.Router();

// 1. 동호회 생성
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      explain,
      region_code,
      region, // Legacy support
      location,
      sport_id,
      sport, // Legacy support
      start_time,
      end_time,
      days_of_week,
      capacity_min,
      capacity_max,
      level_min,
      level_max,
      is_public,
      attachment_id
    } = req.body;

    const ownerId = req.user.id;

    // Map legacy/frontend fields to schema fields
    const finalRegionCode = region_code || region;
    const finalSportId = sport_id || sport;

    // 1. 기본 검증
    if (!name || !explain || !finalRegionCode || !finalSportId || !start_time || !end_time) {
      return res.status(400).json({
        message: "이름, 설명, 지역, 종목, 시작/종료 시간은 필수입니다."
      });
    }

    // 2. 시간 검증
    const today = new Date().toISOString().split('T')[0];
    const start = new Date(`${today}T${start_time}`);
    const end = new Date(`${today}T${end_time}`);

    if (start >= end) {
      return res.status(400).json({
        message: "시작 시간은 종료 시간보다 빨라야 합니다."
      });
    }

    const pool = getPool();

    // 3. DB 저장
    const query = `
      INSERT INTO clubs (
        name, explain, region_code, location, sport_id, 
        start_time, end_time, days_of_week,
        capacity_min, capacity_max, level_min, level_max,
        is_public, owner_user_id, coaching, attachment_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;

    const values = [
      name,
      explain,
      finalRegionCode,
      location || null,
      finalSportId,
      start_time,
      end_time,
      days_of_week || [],
      capacity_min || 3,
      capacity_max || 25,
      level_min,
      level_max,
      is_public !== undefined ? is_public : true,
      ownerId,
      true, // coaching default true per schema
      attachment_id || null
    ];

    const result = await pool.query(query, values);
    const newClub = result.rows[0];

    // 4. 생성자를 멤버(HOST)로 추가
    const memberQuery = `
      INSERT INTO club_members (club_id, user_id, role)
      VALUES ($1, $2, 'HOST')
    `;
    await pool.query(memberQuery, [newClub.id, ownerId]);

    res.status(201).json({
      message: "동호회 개설 완료!",
      club: newClub
    });

  } catch (err) {
    console.error("동호회 생성 중 오류 발생:", err);
    res.status(500).json({ message: "서버 에러 발생" });
  }
});

// 2. 목록 조회
router.get("/", async (req, res) => {
  try {
    const { region, sport, search } = req.query;
    const pool = getPool();

    let sql = `
      SELECT c.*, u.name as owner_name,
             (SELECT COUNT(*) FROM club_members cm WHERE cm.club_id = c.id) as current_members
      FROM clubs c
      JOIN users u ON c.owner_user_id = u.id
    `;

    let params = [];
    let conditions = [];

    if (region) {
      params.push(region);
      conditions.push(`c.region_code = $${params.length}`);
    }
    if (sport) {
      params.push(sport);
      conditions.push(`c.sport_id = $${params.length}`);
    }

    // 검색어가 있으면 name, location, region_code에서 검색
    if (search) {
      params.push(`%${search}%`);
      const searchIndex = params.length;
      conditions.push(`(
        c.name ILIKE $${searchIndex} OR 
        c.location ILIKE $${searchIndex} OR 
        c.region_code ILIKE $${searchIndex}
      )`);
    }

    if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");

    sql += " ORDER BY c.created_at DESC";

    const result = await pool.query(sql, params);
    res.json({ count: result.rows.length, clubs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "목록 조회 실패" });
  }
});

// 3. 상세 조회
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool.query("SELECT * FROM clubs WHERE id = $1", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "없음" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "에러 발생" });
  }
});

// 4. 가입하기
router.post("/:id/join", authenticateToken, async (req, res) => {
  try {
    const clubId = req.params.id;
    const userId = req.user.id;
    const pool = getPool();

    const check = await pool.query(
      "SELECT * FROM club_members WHERE club_id=$1 AND user_id=$2",
      [clubId, userId]
    );
    if (check.rows.length > 0)
      return res.status(409).json({ message: "이미 가입됨" });

    await pool.query(
      `INSERT INTO club_members (club_id, user_id) VALUES ($1, $2)`,
      [clubId, userId]
    );
    res.json({ message: "가입 성공" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "에러 발생" });
  }
});

module.exports = router;
