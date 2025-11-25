const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authenticateToken = require('../middlewares/authenticateToken');

// Middleware applied to all routes
router.use(authenticateToken);

// 1. 내 프로필 조회
router.get('/me', async (req, res) => {
    try {
        const userId = req.user.id;

        // Join users and profiles
        const query = `
      SELECT u.id, u.username, u.name, u.email, u.phone, u.role, u.created_at,
             p.gender, p.age, p.region_code, p.level, p.sports, p.badge_summary
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `;
        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) return res.sendStatus(404);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 2. 내 프로필 수정
router.patch('/me', async (req, res) => {
    try {
        const userId = req.user.id;
        const { gender, age, region_code, level, sports } = req.body;

        // Upsert profile
        const query = `
      INSERT INTO profiles (user_id, gender, age, region_code, level, sports, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET
        gender = EXCLUDED.gender,
        age = EXCLUDED.age,
        region_code = EXCLUDED.region_code,
        level = EXCLUDED.level,
        sports = EXCLUDED.sports,
        updated_at = NOW()
      RETURNING *
    `;

        const result = await pool.query(query, [userId, gender, age, region_code, level, sports]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 3. 프로필 사진 (Avatar) - Placeholder
router.put('/me/avatar', async (req, res) => {
    // Implement file upload logic here or use attachment_id
    res.status(501).json({ message: 'Not implemented yet' });
});

// 4. 예약 스케줄 (Appointments) - Flash Meetups or Clubs joined
router.get('/me/appointments', async (req, res) => {
    try {
        const userId = req.user.id;
        // Get joined flash meetups that are upcoming
        const query = `
      SELECT f.*, fa.state as my_state
      FROM flash_meetups f
      JOIN flash_attendees fa ON f.id = fa.meetup_id
      WHERE fa.user_id = $1 AND f.start_at > NOW()
      ORDER BY f.start_at ASC
    `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 5. 참여 히스토리 (History) - Past meetups
router.get('/me/history', async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
      SELECT f.*, fa.state as my_state
      FROM flash_meetups f
      JOIN flash_attendees fa ON f.id = fa.meetup_id
      WHERE fa.user_id = $1 AND f.end_at < NOW()
      ORDER BY f.start_at DESC
    `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 6. 뱃지 목록
router.get('/me/badges', async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
      SELECT b.*, ub.granted_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
    `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 7. 알림 목록
router.get('/me/notifications', async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC
      LIMIT 20
    `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
