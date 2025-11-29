// src/routes/flashes.js
const express = require("express");
const pool = require("../config/database");
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
    console.log('POST /flashes body:', req.body);
    console.log('attachment_id:', attachment_id);

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

    // 시간 검증 및 변환
    const normalizeTime = (input) => {
      let h, m = 0;
      if (typeof input === 'number') {
        h = input;
      } else if (/^\d+$/.test(input)) {
        h = parseInt(input, 10);
      } else {
        const parts = input.split(':');
        h = parseInt(parts[0], 10);
        m = parts[1] ? parseInt(parts[1], 10) : 0;
      }

      if (h < 0 || h > 24 || m < 0 || m > 59 || (h === 24 && m > 0)) {
        throw new Error("잘못된 시간 형식입니다 (0-24시)");
      }

      return {
        formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
        value: h * 60 + m
      };
    };

    let start, end;
    try {
      start = normalizeTime(start_time);
      end = normalizeTime(end_time);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    // 날짜 + 시간 비교
    // start_at/end_at은 ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)
    // 여기서는 start_time/end_time 필드 자체의 유효성만 검사하거나, 
    // start_at/end_at이 이미 있으므로 그것을 믿을 수도 있음.
    // 하지만 DB에 start_time/end_time 컬럼이 별도로 있으므로 변환된 값을 넣어야 함.

    const finalStartTime = start.formatted;
    const finalEndTime = end.formatted;



    const query = `
      INSERT INTO flash_meetups (
        name, description, attachment_id, host_user_id, 
        sport_id, region_code, place_text, level,
        capacity_min, capacity_max, days_of_week,
        start_at, end_at, start_time, end_time, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      name,
      explain, // Note: req.body still has explain, mapping to description column
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
      finalStartTime,
      finalEndTime,
      'DRAFT'
    ];

    const newFlash = await pool.query(query, values);

    res.status(201).json({
      message: "번개 생성 완료!",
      flash: newFlash.rows[0],
      received_attachment_id: attachment_id
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

    let sql = `
      SELECT f.*, u.name as host_name,
             0 as rating,
             (f.start_at::date - CURRENT_DATE) as d_day_diff,
             (SELECT COUNT(*) FROM flash_attendees fa WHERE fa.meetup_id = f.id) as current_members
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

    const flashes = result.rows.map(flash => {
      const diff = flash.d_day_diff;
      let d_day;
      if (diff === 0) d_day = "D-Day";
      else if (diff > 0) d_day = `D-${diff}`;
      else d_day = `D+${Math.abs(diff)}`;

      return { ...flash, d_day };
    });

    res.json({ count: flashes.length, flashes: flashes });
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
      "SELECT * FROM flash_attendees WHERE meetup_id=$1 AND user_id=$2",
      [flashId, userId]
    );
    if (check.rows.length > 0)
      return res.status(409).json({ message: "이미 참여함" });

    await pool.query(
      `INSERT INTO flash_attendees (meetup_id, user_id) VALUES ($1, $2)`,
      [flashId, userId]
    );
    res.json({ message: "참여 성공" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "에러 발생" });
  }
});

module.exports = router;
