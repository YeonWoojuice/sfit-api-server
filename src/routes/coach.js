const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret';

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// List Coaches
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, u.name, 
                p.introduction, p.region_code, p.sports,
                p.attachment_id,
                CASE 
                    WHEN p.attachment_id IS NOT NULL THEN '/api/attachments/' || p.attachment_id || '/file'
                    ELSE NULL 
                END as image_url,
                u.created_at
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.role = 'COACH'
            ORDER BY u.created_at DESC
        `;
        const { rows } = await pool.query(query);

        res.json({
            count: rows.length,
            coaches: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Request Coach Verification
router.post('/request', authenticateToken, async (req, res) => {
    const { name, certificateNumber } = req.body;
    const userId = req.user.id;

    if (!name || !certificateNumber) {
        return res.status(400).json({ message: '이름과 자격증 번호는 필수입니다.' });
    }

    try {
        console.log(`[DEBUG] Requesting verification for: ${name}, ${certificateNumber}`);
        // 1. Check if certificate exists and matches name (Optional: Can be done by admin, but good to check here too)
        const certResult = await pool.query(
            'SELECT * FROM coach_certifications WHERE certificate_number = $1 AND name = $2',
            [certificateNumber, name]
        );
        console.log(`[DEBUG] Cert found: ${certResult.rows.length}`);

        if (certResult.rows.length === 0) {
            return res.status(404).json({ message: '일치하는 자격증 정보가 없습니다.' });
        }

        // 2. Check if already requested
        const existingRequest = await pool.query(
            "SELECT * FROM coach_requests WHERE user_id = $1 AND status = 'PENDING'",
            [userId]
        );

        if (existingRequest.rows.length > 0) {
            return res.status(409).json({ message: '이미 심사 중인 요청이 있습니다.' });
        }

        // 3. Create Request
        await pool.query(
            'INSERT INTO coach_requests (user_id, name, certificate_number) VALUES ($1, $2, $3)',
            [userId, name, certificateNumber]
        );

        res.json({ message: '코치 인증 요청이 접수되었습니다. 관리자 승인 후 반영됩니다.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
