const express = require("express");
const pool = require("../config/database");
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

    // 2. 시간 검증 및 변환
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

    if (start.value >= end.value) {
      return res.status(400).json({
        message: "시작 시간은 종료 시간보다 빨라야 합니다."
      });
    }

    const finalStartTime = start.formatted;
    const finalEndTime = end.formatted;



    // 3. DB 저장
    const query = `
      INSERT INTO clubs (
        name, explain, region_code, location, sport_id, 
        start_time, end_time, days_of_week,
        capacity_min, capacity_max, level_min, level_max,
        owner_user_id, coaching, attachment_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `;

    const values = [
      name,
      explain,
      finalRegionCode,
      location || null,
      finalSportId,
      finalStartTime,
      finalEndTime,
      days_of_week || [],
      capacity_min || 3,
      capacity_max || 25,
      level_min,
      level_max,
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
    const { region, sport, search, coaching } = req.query;


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
    if (coaching === 'true') {
      conditions.push(`c.coaching = true`);
    }

    // 검색어가 있으면 name, location, region_code, region_name에서 검색
    if (search) {
      params.push(`%${search}%`);
      const searchIndex = params.length;
      conditions.push(`(
        c.name ILIKE $${searchIndex} OR 
        c.location ILIKE $${searchIndex} OR 
        c.region_code ILIKE $${searchIndex} OR
        r.name ILIKE $${searchIndex}
      )`);
    }

    if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");

    sql += " ORDER BY c.created_at DESC";

    const result = await pool.query(sql, params);

    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const clubs = result.rows.map(club => {
      let days = "";
      if (club.days_of_week && club.days_of_week.length > 0) {
        days = club.days_of_week.map(d => dayNames[d]).join(", ");
      }
      return {
        ...club,
        days
      };
    });

    res.json({ count: clubs.length, clubs: clubs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "목록 조회 실패" });
  }
});

// 3. 상세 조회
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("SELECT * FROM clubs WHERE id = $1", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "없음" });

    // 고정 이미지 URL 추가
    const club = {
      ...result.rows[0]
    };

    res.json(club);
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

    // 1. 동호회 존재 여부 확인
    const clubResult = await pool.query("SELECT id FROM clubs WHERE id = $1", [clubId]);
    if (clubResult.rows.length === 0) {
      return res.status(404).json({ message: "존재하지 않는 동호회입니다." });
    }

    // 2. 이미 가입된 멤버인지 확인
    const memberCheck = await pool.query(
      "SELECT * FROM club_members WHERE club_id=$1 AND user_id=$2",
      [clubId, userId]
    );
    if (memberCheck.rows.length > 0) {
      return res.status(409).json({ message: "이미 가입된 동호회입니다." });
    }

    // 3. 즉시 가입 (Auto Join)
    await pool.query(
      `INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, 'MEMBER')`,
      [clubId, userId]
    );
    return res.status(200).json({ message: "가입 성공" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "에러 발생" });
  }
});

// 5. 신청 목록 조회 (방장 전용)
router.get("/:id/applications", authenticateToken, async (req, res) => {
  try {
    const clubId = req.params.id;
    const userId = req.user.id;

    // 방장 권한 확인
    const club = await pool.query("SELECT owner_user_id FROM clubs WHERE id = $1", [clubId]);
    if (club.rows.length === 0) return res.status(404).json({ message: "동호회 없음" });
    if (club.rows[0].owner_user_id !== userId) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    // 신청 목록 조회 (유저 정보 포함)
    const query = `
      SELECT ca.*, u.name as user_name, u.email as user_email
      FROM club_applications ca
      JOIN users u ON ca.user_id = u.id
      WHERE ca.club_id = $1
      ORDER BY ca.created_at DESC
    `;
    const result = await pool.query(query, [clubId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "에러 발생" });
  }
});

// 6. 신청 승인
router.post("/:id/applications/:appId/approve", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id: clubId, appId } = req.params;
    const userId = req.user.id;

    await client.query("BEGIN");

    // 방장 권한 확인
    const club = await client.query("SELECT owner_user_id FROM clubs WHERE id = $1", [clubId]);
    if (club.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "동호회 없음" });
    }
    if (club.rows[0].owner_user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    // 신청 내역 확인
    const app = await client.query("SELECT * FROM club_applications WHERE id = $1 AND club_id = $2", [appId, clubId]);
    if (app.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "신청 내역 없음" });
    }
    if (app.rows[0].status !== 'REQUESTED') {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "이미 처리된 신청입니다." });
    }

    const applicantId = app.rows[0].user_id;

    // 멤버 추가
    await client.query(
      "INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, 'MEMBER') ON CONFLICT DO NOTHING",
      [clubId, applicantId]
    );

    // 신청 상태 업데이트
    await client.query(
      "UPDATE club_applications SET status = 'APPROVED', decided_by = $1, decided_at = NOW() WHERE id = $2",
      [userId, appId]
    );

    await client.query("COMMIT");
    res.json({ message: "승인 완료" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "에러 발생" });
  } finally {
    client.release();
  }
});

// 7. 신청 거절
router.post("/:id/applications/:appId/reject", authenticateToken, async (req, res) => {
  try {
    const { id: clubId, appId } = req.params;
    const userId = req.user.id;

    // 방장 권한 확인
    const club = await pool.query("SELECT owner_user_id FROM clubs WHERE id = $1", [clubId]);
    if (club.rows.length === 0) return res.status(404).json({ message: "동호회 없음" });
    if (club.rows[0].owner_user_id !== userId) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    // 신청 상태 업데이트
    const result = await pool.query(
      "UPDATE club_applications SET status = 'REJECTED', decided_by = $1, decided_at = NOW() WHERE id = $2 AND club_id = $3 AND status = 'REQUESTED' RETURNING *",
      [userId, appId, clubId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "신청 내역이 없거나 이미 처리되었습니다." });
    }

    res.json({ message: "거절 완료" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "에러 발생" });
  }
});

module.exports = router;
