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

module.exports = router;
