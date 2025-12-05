const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedFull() {
    try {
        console.log('Starting full reset and seed...');

        // 1. Cleanup
        console.log('Deleting all data...');
        await pool.query("DELETE FROM club_applications");
        await pool.query("DELETE FROM club_members");
        await pool.query("DELETE FROM clubs");

        // Cleanup Flashes
        // flash_attendees is the join table
        try { await pool.query("DELETE FROM flash_attendees"); } catch (e) { console.log('flash_attendees table might not exist or empty'); }
        await pool.query("DELETE FROM flash_meetups");

        console.log('✅ Data cleared.');

        // 2. Get Users
        // We need a "Main User" (who joins) and an "Owner User" (who creates)
        // If not enough users, create them.
        let usersRes = await pool.query("SELECT id FROM users LIMIT 2");
        let mainUserId, ownerUserId;

        if (usersRes.rows.length < 2) {
            console.log('Not enough users. Creating test users...');
            // Create Owner
            const ownerRes = await pool.query(`
            INSERT INTO users (username, password_hash, name, phone, email, role)
            VALUES ('owner_user', 'hash', 'Owner', '010-0000-0001', 'owner@test.com', 'USER')
            RETURNING id
        `);
            ownerUserId = ownerRes.rows[0].id;

            // Create Main User (if needed)
            if (usersRes.rows.length === 0) {
                const mainRes = await pool.query(`
                INSERT INTO users (username, password_hash, name, phone, email, role)
                VALUES ('main_user', 'hash', 'MainUser', '010-0000-0002', 'main@test.com', 'USER')
                RETURNING id
            `);
                mainUserId = mainRes.rows[0].id;
            } else {
                mainUserId = usersRes.rows[0].id;
            }
        } else {
            ownerUserId = usersRes.rows[0].id;
            mainUserId = usersRes.rows[1].id;
        }
        console.log(`Owner: ${ownerUserId}, Main User: ${mainUserId}`);

        // 3. Seed Clubs (2 clubs)
        console.log('Seeding Clubs...');
        const clubsData = [
            { name: '새벽 러닝 크루', sport_id: 5, region_code: 'SEOUL' },
            { name: '주말 테니스 모임', sport_id: 3, region_code: 'GYEONGGI' }
        ];

        for (const c of clubsData) {
            const res = await pool.query(`
            INSERT INTO clubs (name, explain, region_code, sport_id, owner_user_id, start_time, end_time, days_of_week)
            VALUES ($1, '설명', $2, $3, $4, '10:00', '12:00', '{1}')
            RETURNING id
        `, [c.name, c.region_code, c.sport_id, ownerUserId]);
            const clubId = res.rows[0].id;

            // Main User joins
            await pool.query(`
            INSERT INTO club_members (club_id, user_id, role)
            VALUES ($1, $2, 'MEMBER')
        `, [clubId, mainUserId]);
        }
        console.log('✅ 2 Clubs created and joined.');

        // 4. Seed Flashes (3 flashes, 2 joined)
        console.log('Seeding Flashes...');
        const flashesData = [
            { name: '오늘 밤 한강 번개', sport_id: 5, region_code: 'SEOUL', join: true },
            { name: '내일 오전 배드민턴', sport_id: 4, region_code: 'SEOUL', join: true },
            { name: '주말 등산 번개', sport_id: 6, region_code: 'GANGWON', join: false }
        ];

        for (const f of flashesData) {
            // Date: tomorrow
            const date = new Date();
            date.setDate(date.getDate() + 1);
            const dateStr = date.toISOString().split('T')[0];

            const res = await pool.query(`
            INSERT INTO flash_meetups (name, explain, region_code, sport_id, host_user_id, date, start_time, end_time)
            VALUES ($1, '번개 설명', $2, $3, $4, $5, '18:00', '20:00')
            RETURNING id
        `, [f.name, f.region_code, f.sport_id, ownerUserId, dateStr]);
            const flashId = res.rows[0].id;

            if (f.join) {
                try {
                    await pool.query(`
                    INSERT INTO flash_attendees (meetup_id, user_id, state)
                    VALUES ($1, $2, 'JOINED')
                `, [flashId, mainUserId]);
                } catch (e) {
                    console.log(`Failed to join flash ${flashId}: ${e.message}`);
                }
            }
        }
        console.log('✅ 3 Flashes created (2 joined).');

    } catch (err) {
        console.error('Seed failed:', err);
    } finally {
        await pool.end();
    }
}

seedFull();
