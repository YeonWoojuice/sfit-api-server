const { Router } = require('express');
const { getPool } = require('../config/database');

const router = Router();

// GET /api/regions
router.get('/regions', async (req, res) => {
    try {
        const pool = getPool();
        // If table doesn't exist yet, return mock data or empty
        try {
            const result = await pool.query("SELECT * FROM regions ORDER BY code");
            res.json(result.rows);
        } catch (dbError) {
            // Fallback for development if table is empty/missing
            res.json([
                { code: 'SEOUL', name: '서울' },
                { code: 'GYEONGGI', name: '경기' },
                { code: 'INCHEON', name: '인천' },
                { code: 'BUSAN', name: '부산' },
                { code: 'DAEGU', name: '대구' },
                { code: 'GWANGJU', name: '광주' },
                { code: 'DAEJEON', name: '대전' },
                { code: 'ULSAN', name: '울산' },
                { code: 'GYEONGBUK', name: '경북' },
                { code: 'CHUNGNAM', name: '충남' },
                { code: 'CHUNGBUK', name: '충북' }
            ]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러" });
    }
});

// GET /api/sports
router.get('/sports', async (req, res) => {
    try {
        const pool = getPool();
        try {
            const result = await pool.query("SELECT * FROM sports WHERE active = true ORDER BY id");
            res.json(result.rows);
        } catch (dbError) {
            // Fallback
            res.json([
                { id: 1, name: '야구' },
                { id: 2, name: '축구' },
                { id: 3, name: '골프' },
                { id: 4, name: '수영' },
                { id: 5, name: '러닝' },
                { id: 6, name: '테니스' }
            ]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러" });
    }
});

module.exports = router;
