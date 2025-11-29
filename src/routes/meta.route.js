const { Router } = require('express');
const pool = require('../config/database');

const router = Router();

// GET /api/regions
router.get('/regions', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM regions ORDER BY code");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러" });
    }
});

// GET /api/sports
router.get('/sports', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM sports WHERE active = true ORDER BY id");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러" });
    }
});

// GET /api/dates
router.get('/dates', (req, res) => {
    const today = new Date();
    const days = ["일", "월", "화", "수", "목", "금", "토"];

    // Generate next 7 days
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push({
            date: d.toISOString().split('T')[0],
            day: days[d.getDay()],
            day_index: d.getDay()
        });
    }

    res.json({
        today: today.toISOString().split('T')[0],
        days: days,
        dates: dates,
        time_slots: Array.from({ length: 24 }, (_, i) => i) // 0-23 hours
    });
});

module.exports = router;
