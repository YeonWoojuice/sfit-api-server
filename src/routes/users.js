const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticateToken = require('../middlewares/authenticateToken');
const pool = require('../config/database');

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 1. 내 정보 조회/수정
router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);
router.put('/me/avatar', userController.updateAvatar);

// 2. 내 활동 조회
router.get('/me/clubs', userController.getMyClubs);
router.get('/me/flashes', userController.getMyFlashes);

// 3. 뱃지 목록 (Existing)
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

// 4. 알림 목록 (Existing)
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
