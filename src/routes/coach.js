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

// Verify Coach Certification
router.post('/verify', authenticateToken, async (req, res) => {
    const { name, certificateNumber } = req.body;

    if (!name || !certificateNumber) {
        return res.status(400).json({ message: '이름과 자격증 번호는 필수입니다.' });
    }

    try {
        // 1. Check if certificate exists and matches name
        const certResult = await pool.query(
            'SELECT * FROM coach_certifications WHERE certificate_number = $1 AND name = $2',
            [certificateNumber, name]
        );

        if (certResult.rows.length === 0) {
            return res.status(404).json({ message: '일치하는 자격증 정보가 없습니다.' });
        }

        const cert = certResult.rows[0];

        // 2. Update user role to COACH
        await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2',
            ['COACH', req.user.id]
        );

        res.json({
            message: '코치 인증이 완료되었습니다.',
            certification: {
                level: cert.level,
                sport_id: cert.sport_id,
                issue_date: cert.issue_date
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
