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
      level_min,
      level_max,
      capacity_min,
      capacity_max,
      days_of_week,
      date, // [NEW] "YYYY-MM-DD"
      start_time,
      end_time,
    } = req.body;
    const hostUserId = req.user.id;
    console.log('POST /flashes body:', req.body);

    // Map legacy fields
    const finalSportId = sport_id || sport;
    const finalRegionCode = region_code || region;

    // 필수 필드 검증
    if (!name || !explain || !finalSportId || !finalRegionCode ||
      !date || !start_time || !end_time) {
      return res.status(400).json({
        message: "필수 정보 누락: 이름, 설명, 종목, 지역, 날짜(date), 시작/종료 시간은 필수입니다."
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

    // 날짜 + 시간 조합하여 ISO String 생성
    // date: "YYYY-MM-DD"
    // start.formatted: "HH:mm:00"
    const start_at = new Date(`${date}T${start.formatted}`).toISOString();
    const end_at = new Date(`${date}T${end.formatted}`).toISOString();

    const finalStartTime = start.formatted;
    const finalEndTime = end.formatted;

    const query = `
      INSERT INTO flash_meetups (
        name, description, attachment_id, host_user_id, 
        sport_id, region_code, place_text, level_min, level_max,
        capacity_min, capacity_max, days_of_week,
        start_at, end_at, start_time, end_time, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
      level_min || 1,
      level_max || 5,
      capacity_min || 3,
      capacity_max || 25,
      days_of_week || [],
      start_at,
      end_at,
      finalStartTime,
      finalEndTime,
      'DRAFT'
    ];

    // Helper to format response
    const formatFlashResponse = (flash) => {
      const { start_at, end_at, ...rest } = flash;
      // start_at is ISO string or Date object.
      // We assume start_at is stored in UTC or local time correctly.
      // Since we input YYYY-MM-DD + HH:mm, start_at should reflect that.
      // We just need to extract YYYY-MM-DD part.
      // However, simply taking substring of ISO string might be affected by timezone if not careful.
      // But here we constructed start_at from date + time.
      // Let's use the 'date' field if available, or derive it.
      // Actually, we can just return the 'date' input if available, but for GET requests we need to derive it.

      // For consistency, let's derive it from start_at string.
      // If start_at is "2025-12-25T10:00:00.000Z", date is "2025-12-25".
      const dateStr = new Date(start_at).toISOString().split('T')[0];

      return {
        ...rest,
        date: dateStr
      };
    };

    const newFlash = await pool.query(query, values);
    const formattedFlash = formatFlashResponse(newFlash.rows[0]);

    res.status(201).json({
      message: "번개 생성 완료!",
      flash: formattedFlash,
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

      // Format response: extract date, remove start_at/end_at
      const { start_at, end_at, ...rest } = flash;
      const dateStr = new Date(start_at).toISOString().split('T')[0];

      return { ...rest, date: dateStr, d_day };
    });

    res.json({ count: flashes.length, flashes: flashes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "조회 실패" });
  }
});

// 3. 참여하기
router.post("/:id/join", authenticateToken, async (req, res) => {
  const flashId = req.params.id;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. 번개 정보 및 사용자 레벨 조회
    const flashQuery = `
        SELECT f.*, 
               (SELECT COUNT(*) FROM flash_attendees WHERE meetup_id = f.id AND state = 'JOINED') as current_members
        FROM flash_meetups f
        WHERE f.id = $1
      `;
    const flashResult = await client.query(flashQuery, [flashId]);

    if (flashResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "존재하지 않는 번개입니다." });
    }

    const flash = flashResult.rows[0];

    // Format response (optional, but good for consistency if we returned the flash object)
    // Here we just return a message, so we don't strictly need to format it, 
    // but the logic uses flash properties.

    // 2. 방장 체크
    if (flash.host_user_id === userId) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: "방장은 참가 신청할 수 없습니다." });
    }

    // 3. 정원 체크
    if (parseInt(flash.current_members) >= flash.capacity_max) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: "정원이 초과되었습니다." });
    }

    // 4. 레벨 체크
    const userQuery = `
        SELECT p.level 
        FROM profiles p 
        WHERE p.user_id = $1
      `;
    const userResult = await client.query(userQuery, [userId]);

    // 프로필이 없는 경우 기본 레벨 1로 간주하거나 에러 처리
    const userLevel = userResult.rows.length > 0 ? userResult.rows[0].level : 1;

    if (userLevel < flash.level_min || userLevel > flash.level_max) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        message: `참가 가능한 레벨이 아닙니다. (제한: ${flash.level_min}~${flash.level_max}, 내 레벨: ${userLevel})`
      });
    }

    // 5. 중복 체크
    const checkQuery = "SELECT * FROM flash_attendees WHERE meetup_id=$1 AND user_id=$2";
    const checkResult = await client.query(checkQuery, [flashId, userId]);

    if (checkResult.rows.length > 0) {
      const attendee = checkResult.rows[0];
      if (attendee.state === 'JOINED') {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: "이미 참여함" });
      } else {
        // 나갔던 유저 재가입 (UPDATE)
        await client.query(
          `UPDATE flash_attendees SET state = 'JOINED', joined_at = NOW() WHERE id = $1`,
          [attendee.id]
        );
      }
    } else {
      // 신규 가입 (INSERT)
      await client.query(
        `INSERT INTO flash_attendees (meetup_id, user_id) VALUES ($1, $2)`,
        [flashId, userId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: "참여 성공" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: "에러 발생" });
  } finally {
    client.release();
  }
});

module.exports = router;
