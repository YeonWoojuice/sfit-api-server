const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

// Popular Coaches (Top 10 by Rating)
router.get('/popular', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, u.name, 
                p.introduction, p.region_code, 
                p.sports as sport_ids,
                (
                    SELECT string_agg(s.name, ', ')
                    FROM sports s
                    WHERE s.id = ANY(p.sports)
                ) as sport_names,
                COALESCE(p.rating, 0) as rating,
                p.age,
                CASE 
                    WHEN p.age IS NOT NULL THEN (FLOOR(p.age / 10) * 10) || '대'
                    ELSE '연령 미상' 
                END as age_group,
                p.attachment_id,
                CASE 
                    WHEN p.attachment_id IS NOT NULL THEN '/api/attachments/' || p.attachment_id || '/file'
                    ELSE NULL 
                END as image_url
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.role = 'COACH'
            ORDER BY p.rating DESC NULLS LAST
            LIMIT 10
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Recommend Coaches (AI)
router.get('/recommend', async (req, res) => {
    try {
        let userProfile = {};
        let userId = null;

        // 1. Try to authenticate (Optional)
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            try {
                const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                userId = user.id;

                // Fetch profile from DB
                const userProfileRes = await pool.query(
                    'SELECT region_code, sports, age FROM profiles WHERE user_id = $1',
                    [userId]
                );
                if (userProfileRes.rows.length > 0) {
                    userProfile = userProfileRes.rows[0];
                }
            } catch (err) {
                console.log('Token verification failed or expired, proceeding as guest');
            }
        }

        // 2. If no profile from DB (Guest or Profile not set), use Query Params
        if (!userProfile.region_code) {
            userProfile.region_code = req.query.region;
            if (req.query.sports) {
                userProfile.sports = req.query.sports.split(',').map(Number);
            }
            if (req.query.age) {
                userProfile.age = parseInt(req.query.age);
            }
        }

        const userSports = userProfile.sports || [];
        const userRegion = userProfile.region_code;
        const userAge = userProfile.age;

        // 3. Validate minimal requirements
        if (!userRegion && userSports.length === 0 && !userAge) {
            return res.status(400).json({ message: '프로필 설정(로그인) 또는 쿼리 파라미터(region, sports, age)가 필요합니다.' });
        }

        // 2. Get All Coaches
        const coachesQuery = `
            SELECT 
                u.id, u.name, 
                p.introduction, p.region_code, 
                p.sports as sport_ids,
                (
                    SELECT string_agg(s.name, ', ')
                    FROM sports s
                    WHERE s.id = ANY(p.sports)
                ) as sport_names,
                COALESCE(p.rating, 0) as rating,
                p.age,
                CASE 
                    WHEN p.age IS NOT NULL THEN (FLOOR(p.age / 10) * 10) || '대'
                    ELSE '연령 미상' 
                END as age_group,
                p.attachment_id,
                CASE 
                    WHEN p.attachment_id IS NOT NULL THEN '/api/attachments/' || p.attachment_id || '/file'
                    ELSE NULL 
                END as image_url
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.role = 'COACH'
        `;
        const { rows: coaches } = await pool.query(coachesQuery);

        // 3. Calculate Scores (Rule-based Filtering)
        const scoredCoaches = coaches.map(coach => {
            let score = 0;
            const reasons = [];

            // Criteria 1: Sport Match (+50)
            const coachSports = coach.sport_ids || [];
            const commonSports = coachSports.filter(id => userSports.includes(id));
            if (commonSports.length > 0) {
                score += 50;
                reasons.push('관심 종목 일치');
            }

            // Criteria 2: Region Match (+30)
            if (userRegion && coach.region_code === userRegion) {
                score += 30;
                reasons.push('같은 지역');
            }

            // Criteria 3: Rating (+ Rating * 2, Max 10)
            if (coach.rating) {
                score += Math.min(coach.rating * 2, 10);
            }

            // Criteria 4: Age Match (+10 if within 5 years)
            if (userAge && coach.age) {
                if (Math.abs(userAge - coach.age) <= 5) {
                    score += 10;
                    reasons.push('비슷한 연령대');
                }
            }

            return { ...coach, score, recommendation_reason: reasons.join(', ') };
        });

        // Sort by score and take top 10 candidates for AI analysis
        scoredCoaches.sort((a, b) => b.score - a.score);
        const candidates = scoredCoaches.slice(0, 10);

        if (candidates.length === 0) {
            return res.json({ count: 0, recommendations: [] });
        }

        // 4. AI Analysis (OpenAI)
        try {
            const prompt = `
            You are an expert sports coach recommender.
            
            User Profile:
            - Region: ${userRegion || 'Unknown'}
            - Sports: ${userSports.join(', ')} (IDs)
            - Age: ${userAge || 'Unknown'}

            Candidates (Top 10 Rule-based):
            ${JSON.stringify(candidates.map(c => ({
                id: c.id,
                name: c.name,
                intro: c.introduction,
                region: c.region_code,
                sports: c.sport_names,
                rating: c.rating,
                age: c.age
            })))}

            Task:
            Select the top 3-5 coaches who are the best match for this user.
            Consider the user's region, sports interests, and age.
            Also consider the coach's introduction and rating.
            
            Output JSON format:
            {
                "recommendations": [
                    {
                        "id": "coach_id",
                        "reason": "Detailed reason why this coach is a good match (in Korean)"
                    }
                ]
            }
            `;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a helpful assistant that outputs JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });

            const aiResult = JSON.parse(completion.choices[0].message.content);

            // Merge AI results with full coach objects
            const finalRecommendations = aiResult.recommendations.map(aiRec => {
                const originalCoach = candidates.find(c => c.id === aiRec.id);
                if (originalCoach) {
                    return {
                        ...originalCoach,
                        recommendation_reason: aiRec.reason // Override with AI reason
                    };
                }
                return null;
            }).filter(c => c !== null);

            res.json({
                count: finalRecommendations.length,
                recommendations: finalRecommendations
            });

        } catch (aiError) {
            console.error('OpenAI Error:', aiError);
            // Fallback to rule-based top 5
            res.json({
                count: Math.min(candidates.length, 5),
                recommendations: candidates.slice(0, 5)
            });
        }


    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// List Coaches
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, u.name, 
                p.introduction, p.region_code, 
                p.sports as sport_ids,
                (
                    SELECT string_agg(s.name, ', ')
                    FROM sports s
                    WHERE s.id = ANY(p.sports)
                ) as sport_names,
                COALESCE(p.rating, 0) as rating,
                CASE 
                    WHEN p.age IS NOT NULL THEN (FLOOR(p.age / 10) * 10) || '대'
                    ELSE '연령 미상' 
                END as age_group,
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
