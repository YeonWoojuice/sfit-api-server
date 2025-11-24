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
            // Fallback for development with hierarchical region data
            res.json([
                { code: 'SEOUL', name: '서울', parent: null },
                { code: 'SEOUL_GANGNAM', name: '강남구', parent: 'SEOUL' },
                { code: 'SEOUL_SEOCHO', name: '서초구', parent: 'SEOUL' },
                { code: 'SEOUL_SONGPA', name: '송파구', parent: 'SEOUL' },
                { code: 'SEOUL_GANGDONG', name: '강동구', parent: 'SEOUL' },
                { code: 'SEOUL_MAPO', name: '마포구', parent: 'SEOUL' },
                { code: 'SEOUL_YONGSAN', name: '용산구', parent: 'SEOUL' },
                { code: 'SEOUL_JONGNO', name: '종로구', parent: 'SEOUL' },
                { code: 'SEOUL_JUNG', name: '중구', parent: 'SEOUL' },

                { code: 'GYEONGGI', name: '경기', parent: null },
                { code: 'GYEONGGI_BUNDANG', name: '분당구', parent: 'GYEONGGI' },
                { code: 'GYEONGGI_SEONGNAM', name: '성남시', parent: 'GYEONGGI' },
                { code: 'GYEONGGI_SUWON', name: '수원시', parent: 'GYEONGGI' },
                { code: 'GYEONGGI_YONGIN', name: '용인시', parent: 'GYEONGGI' },
                { code: 'GYEONGGI_GOYANG', name: '고양시', parent: 'GYEONGGI' },
                { code: 'GYEONGGI_SEONGBUK', name: '성북구', parent: 'GYEONGGI' },

                { code: 'INCHEON', name: '인천', parent: null },
                { code: 'INCHEON_NAMDONG', name: '남동구', parent: 'INCHEON' },
                { code: 'INCHEON_YEONSU', name: '연수구', parent: 'INCHEON' },

                { code: 'BUSAN', name: '부산', parent: null },
                { code: 'BUSAN_HAEUNDAE', name: '해운대구', parent: 'BUSAN' },
                { code: 'BUSAN_SUYEONG', name: '수영구', parent: 'BUSAN' },

                { code: 'DAEGU', name: '대구', parent: null },
                { code: 'GWANGJU', name: '광주', parent: null },
                { code: 'DAEJEON', name: '대전', parent: null },
                { code: 'ULSAN', name: '울산', parent: null },
                { code: 'GYEONGBUK', name: '경북', parent: null },
                { code: 'CHUNGNAM', name: '충남', parent: null },
                { code: 'CHUNGBUK', name: '충북', parent: null }
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
