// src/routes/flashes.js (참가비, 상태 추가)
const express = require("express");
const pool = require("../config/database");
const authenticateToken = require("../middlewares/authenticateToken");

const router = express.Router();

// 1. 번개 생성
router.post("/", authenticateToken, async (req, res) => {
  try {
    // ★ fee(참가비) 추가됨
    const {
      title,
      description,
      meeting_date,
      region,
      sport,
      max_members,
      fee,
    } = req.body;
    const hostId = req.user.id;

    if (!title || !meeting_date || !region || !sport) {
      return res.status(400).json({ message: "필수 정보 누락" });
    }

    const newFlash = await pool.query(
      `INSERT INTO flash_meetups (title, description, meeting_date, region, sport, max_members, fee, host_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN') 
       RETURNING *`,
      [
        title,
        description,
        meeting_date,
        region,
        sport,
        max_members || 10,
        fee || 0,
        hostId,
      ]
    );

    const flashId = newFlash.rows[0].id;
    // 주최자 자동 참여
    await pool.query(
      `INSERT INTO flash_attendees (flash_id, user_id) VALUES ($1, $2)`,
      [flashId, hostId]
    );

    res
      .status(201)
      .json({ message: "번개 생성 완료!", flash: newFlash.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 2. 목록 조회 (참가비, 상태 포함)
router.get("/", async (req, res) => {
  try {
    const { region, sport } = req.query;

    let sql = `
      SELECT f.*, u.nickname as host_nickname,
             (SELECT COUNT(*) FROM flash_attendees fa WHERE fa.flash_id = f.id) as current_members
      FROM flash_meetups f
      JOIN users u ON f.host_id = u.id
    `;

    let params = [];
    let conditions = [];

    if (region) {
      params.push(region);
      conditions.push(`f.region = $${params.length}`);
    }
    if (sport) {
      params.push(sport);
      conditions.push(`f.sport = $${params.length}`);
    }

    if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");

    sql += " ORDER BY f.meeting_date ASC";

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
