// src/routes/flashes.js
const express = require("express");
const { getPool } = require("../config/database");
const authenticateToken = require("../middlewares/authenticateToken");

const router = express.Router();

// 1. 번개 생성
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      explain,
      attachment_id,
      sport_id,
      sport, // Legacy support
      region_code,
      region, // Legacy support
      place_text,
      level,
      capacity_min,
      capacity_max,
      days_of_week,
      start_at,
      end_at,
      start_time,
      end_time,
    } = req.body;
    const hostUserId = req.user.id;

    // Map legacy fields
    const finalSportId = sport_id || sport;
    const finalRegionCode = region_code || region;

    // 필수 필드 검증 (스키마 기준 NOT NULL, 기본값 없는 필드)
    if (!name || !explain || !finalSportId || !finalRegionCode ||
      !start_at || !end_at || !start_time || !end_time) {
      return res.status(400).json({
        message: "필수 정보 누락: 이름, 설명, 종목, 지역, 시작/종료 날짜, 시작/종료 시간은 필수입니다."
      });
    }

    // 시간 검증
    const startDate = new Date(start_at);
    const endDate = new Date(end_at);
    if (startDate >= endDate) {
      return res.status(400).json({
        message: "시작 날짜는 종료 날짜보다 빨라야 합니다."
      });
    }

    const pool = getPool();

    const query = `
      INSERT INTO flash_meetups (
        name, explain, attachment_id, host_user_id, 
        sport_id, region_code, place_text, level,
        capacity_min, capacity_max, days_of_week,
        start_at, end_at, start_time, end_time, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      name,
      explain,
      attachment_id || null,
      hostUserId,
      finalSportId,
      finalRegionCode,
      place_text || null,
      level || 1,
      capacity_min || 3,
      capacity_max || 25,
      days_of_week || [],
      start_at,
      end_at,
      start_time,
      end_time,
      'DRAFT' // 기본 상태
    ];

    const newFlash = await pool.query(query, values);

    res.status(201).json({
      message: "번개 생성 완료!",
      flash: newFlash.rows[0]
    });
  } catch (err) {
    console.error("번개 생성 중 오류 발생:", err);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 2. 목록 조회
router.get("/", async (req, res) => {
  try {
    const { region, sport } = req.query;
    const pool = getPool();

    let sql = `
      SELECT f.*, u.name as host_name,
             (SELECT COUNT(*) FROM flash_attendees fa WHERE fa.flash_id = f.id) as current_members
      FROM flash_meetups f
      JOIN users u ON f.host_user_id = u.id
    `;

    let params = [];
    let conditions = [];

    if (region) {
      params.push(region);
      conditions.push(`f.region_code = $${params.length}`);
    }
    if (sport) {
      params.push(sport);
      conditions.push(`f.sport_id = $${params.length}`);
    }

    if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");

    sql += " ORDER BY f.start_at ASC";

    const result = await pool.query(sql, params);
    res.json({ count: result.rows.length, flashes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "조회 실패" });
  }
});

// 3. 참여하기
router.post("/:id/join", authenticateToken, async (req, res) => {
  try {
    const flashId = req.params.id;
    const userId = req.user.id;
    const pool = getPool();

    const check = await pool.query(
      "SELECT * FROM flash_attendees WHERE flash_id=$1 AND user_id=$2",
      [flashId, userId]
    );
    if (check.rows.length > 0)
      return res.status(409).json({ message: "이미 참여함" });

    await pool.query(
      `INSERT INTO flash_attendees (flash_id, user_id) VALUES ($1, $2)`,
      [flashId, userId]
    );
    res.json({ message: "참여 성공" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "에러 발생" });
  }
});

module.exports = router;
