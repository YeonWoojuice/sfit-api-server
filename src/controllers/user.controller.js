const pool = require('../config/database');

// 내 정보 조회 (프로필 포함)
exports.getMe = async (req, res) => {
    const userId = req.user.id;
    try {
        // 사용자 기본 정보 + 프로필 정보 + 아바타 이미지 URL + 활동 통계
        const query = `
            SELECT 
                u.id, u.username, u.name, u.email, u.phone, u.role, u.created_at,
                p.gender, p.age, p.region_code, p.level, p.sports, p.badge_summary, p.introduction,
                p.attachment_id,
                CASE 
                    WHEN a.file_path IS NOT NULL THEN '/api/attachments/' || a.id || '/file'
                    ELSE NULL 
                END as avatar_url,
                (SELECT COUNT(*) FROM club_members WHERE user_id = u.id AND state = 'MEMBER') as club_count,
                (SELECT COUNT(*) FROM club_applications WHERE user_id = u.id AND status = 'REQUESTED') as application_count
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN attachments a ON p.attachment_id = a.id
            WHERE u.id = $1
        `;
        const { rows } = await pool.query(query, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};

// 내 정보 수정 (기본 정보 + 프로필)
exports.updateMe = async (req, res) => {
    const userId = req.user.id;
    const { name, phone, region_code, sports, introduction, age, gender, level } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. users 테이블 업데이트 (name, phone)
        if (name || phone) {
            const userUpdateQuery = `
                UPDATE users 
                SET 
                    name = COALESCE($1, name),
                    phone = COALESCE($2, phone),
                    updated_at = NOW()
                WHERE id = $3
            `;
            await client.query(userUpdateQuery, [name, phone, userId]);
        }

        // 2. profiles 테이블 업데이트 (UPSERT)
        const profileCheckQuery = `SELECT id FROM profiles WHERE user_id = $1`;
        const profileCheck = await client.query(profileCheckQuery, [userId]);

        if (profileCheck.rows.length > 0) {
            // Update
            const profileUpdateQuery = `
                UPDATE profiles
                SET
                    region_code = COALESCE($1, region_code),
                    sports = COALESCE($2, sports),
                    introduction = COALESCE($3, introduction),
                    age = COALESCE($4, age),
                    gender = COALESCE($5, gender),
                    level = COALESCE($6, level),
                    updated_at = NOW()
                WHERE user_id = $7
            `;
            await client.query(profileUpdateQuery, [region_code, sports, introduction, age, gender, level, userId]);
        } else {
            // Insert
            const profileInsertQuery = `
                INSERT INTO profiles (user_id, region_code, sports, introduction, age, gender, level)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            await client.query(profileInsertQuery, [userId, region_code, sports, introduction, age, gender, level]);
        }

        await client.query('COMMIT');

        // 업데이트된 정보 반환을 위해 getMe 로직 재사용 또는 성공 메시지 반환
        res.json({ message: '정보가 수정되었습니다.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('updateMe error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    } finally {
        client.release();
    }
};

// 아바타 이미지 수정
exports.updateAvatar = async (req, res) => {
    const userId = req.user.id;
    const { attachment_id } = req.body;

    // attachment_id가 없거나 빈 문자열이면 null로 처리 (아바타 삭제)
    const finalAttachmentId = attachment_id || null;

    try {
        // 프로필이 없으면 생성 후 업데이트, 있으면 업데이트
        const query = `
            INSERT INTO profiles (user_id, attachment_id, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET attachment_id = $2, updated_at = NOW()
        `;
        await pool.query(query, [userId, finalAttachmentId]);

        res.json({ message: '아바타가 수정되었습니다.' });
    } catch (error) {
        console.error('updateAvatar error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};

// 내가 가입한/운영중인 동호회 목록
exports.getMyClubs = async (req, res) => {
    const userId = req.user.id;
    try {
        const refinedQuery = `
             SELECT 
                c.id, c.name, c.region_code, c.sport_id, 
                c.attachment_id,
                cm.role as my_role, cm.joined_at,
                (SELECT COUNT(*) FROM club_members WHERE club_id = c.id AND state = 'MEMBER') as member_count
            FROM club_members cm
            JOIN clubs c ON cm.club_id = c.id
            WHERE cm.user_id = $1 AND cm.state = 'MEMBER'
            ORDER BY cm.joined_at DESC
        `;

        const { rows } = await pool.query(refinedQuery, [userId]);
        res.json(rows);
    } catch (error) {
        console.error('getMyClubs error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};

// 내가 참여한/주최한 번개 목록
exports.getMyFlashes = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT 
                f.id, f.name, f.start_at, f.region_code, f.sport_id,
                f.attachment_id,
                fa.state as my_state,
                CASE WHEN f.host_user_id = $1 THEN true ELSE false END as is_host
            FROM flash_meetups f
            LEFT JOIN flash_attendees fa ON f.id = fa.meetup_id AND fa.user_id = $1
            WHERE f.host_user_id = $1 OR (fa.user_id = $1 AND fa.state = 'JOINED')
            ORDER BY f.start_at DESC
        `;
        const { rows } = await pool.query(query, [userId]);

        const formattedRows = rows.map(row => {
            const { start_at, ...rest } = row;
            const dateStr = new Date(start_at).toISOString().split('T')[0];
            return { ...rest, date: dateStr };
        });

        res.json(formattedRows);
    } catch (error) {
        console.error('getMyFlashes error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};

// 내 모임 통합 조회 (동호회 + 번개)
exports.getMyMeetings = async (req, res) => {
    const userId = req.user.id;
    try {
        // 1. 내 동호회 조회
        const clubsQuery = `
             SELECT 
                c.id, c.name, c.region_code, c.sport_id, 
                c.attachment_id,
                cm.role as my_role, cm.joined_at,
                (SELECT COUNT(*) FROM club_members WHERE club_id = c.id AND state = 'MEMBER') as member_count
            FROM club_members cm
            JOIN clubs c ON cm.club_id = c.id
            WHERE cm.user_id = $1 AND cm.state = 'MEMBER'
            ORDER BY cm.joined_at DESC
        `;
        const clubsResult = await pool.query(clubsQuery, [userId]);

        // 2. 내 번개 조회
        const flashesQuery = `
            SELECT 
                f.id, f.name, f.start_at, f.region_code, f.sport_id,
                f.attachment_id,
                fa.state as my_state,
                CASE WHEN f.host_user_id = $1 THEN true ELSE false END as is_host
            FROM flash_meetups f
            LEFT JOIN flash_attendees fa ON f.id = fa.meetup_id AND fa.user_id = $1
            WHERE f.host_user_id = $1 OR (fa.user_id = $1 AND fa.state = 'JOINED')
            ORDER BY f.start_at DESC
        `;
        const flashesResult = await pool.query(flashesQuery, [userId]);

        const formattedFlashes = flashesResult.rows.map(row => {
            const { start_at, ...rest } = row;
            const dateStr = new Date(start_at).toISOString().split('T')[0];
            return { ...rest, date: dateStr };
        });

        res.json({
            clubs: clubsResult.rows,
            flashes: formattedFlashes
        });

    } catch (error) {
        console.error('getMyMeetings error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};

// 내 활동 히스토리 (동호회 + 번개)
exports.getMyHistory = async (req, res) => {
    const userId = req.user.id;
    const { type } = req.query; // 'all', 'club', 'flash'

    try {
        let history = [];

        // 1. 동호회 활동 (가입일 기준)
        if (type !== 'flash') {
            const clubsQuery = `
                SELECT 
                    'CLUB' as type,
                    c.id, c.name, c.region_code, c.location, 
                    c.explain, -- 설명 (DB 컬럼명: explain)
                    c.attachment_id, -- 이미지 ID 추가
                    cm.joined_at as date,
                    cm.role as my_role,
                    NULL as rating -- 별점은 리뷰 테이블에서 가져와야 하지만 일단 NULL
                FROM club_members cm
                JOIN clubs c ON cm.club_id = c.id
                WHERE cm.user_id = $1
            `;
            const clubsResult = await pool.query(clubsQuery, [userId]);
            history = [...history, ...clubsResult.rows];
        }

        // 2. 번개 활동 (종료된 번개 or 시작일 기준)
        if (type !== 'club') {
            const flashesQuery = `
                SELECT 
                    'FLASH' as type,
                    f.id, f.name, f.region_code, f.location,
                    f.explain, -- 설명 (DB 컬럼명: explain)
                    f.attachment_id, -- 이미지 ID 추가
                    f.start_at as date,
                    fa.state as my_state,
                    NULL as rating
                FROM flash_attendees fa
                JOIN flash_meetups f ON fa.meetup_id = f.id
                WHERE fa.user_id = $1 AND f.start_at < NOW() -- 지난 번개만
            `;
            const flashesResult = await pool.query(flashesQuery, [userId]);
            history = [...history, ...flashesResult.rows];
        }

        // 3. 날짜순 정렬 (최신순)
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 날짜 포맷팅 및 이미지 URL 생성
        const formattedHistory = history.map(item => ({
            ...item,
            date: new Date(item.date).toISOString().split('T')[0],
            image_url: item.attachment_id ? `/api/attachments/${item.attachment_id}/file` : null
        }));

        res.json(formattedHistory);

    } catch (error) {
        console.error('getMyHistory error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};

// 내 뱃지 조회
exports.getMyBadges = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT 
                b.id, b.code, b.label, b.desc, b.type,
                ub.granted_at
            FROM user_badges ub
            JOIN badges b ON ub.badge_id = b.id
            WHERE ub.user_id = $1
            ORDER BY ub.granted_at DESC
        `;
        const { rows } = await pool.query(query, [userId]);
        res.json(rows);
    } catch (error) {
        console.error('getMyBadges error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
};
