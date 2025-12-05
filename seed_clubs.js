const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    try {
        console.log('Cleaning up old clubs (keeping Soccer Club)...');
        // Delete clubs that do not contain '축구'
        const deleteRes = await pool.query("DELETE FROM clubs WHERE name NOT LIKE '%축구%'");
        console.log(`Deleted ${deleteRes.rowCount} old clubs.`);

        // Get a user ID to be the owner of new clubs (just pick the first one)
        const userRes = await pool.query("SELECT id FROM users LIMIT 1");
        if (userRes.rows.length === 0) {
            console.log('No users found. Cannot seed clubs.');
            return;
        }
        const ownerId = userRes.rows[0].id;

        console.log('Seeding new example clubs...');
        const newClubs = [
            {
                name: '한강 러닝 크루',
                explain: '매주 목요일 저녁 반포한강공원에서 함께 달려요! 초보자 환영합니다.',
                region_code: 'SEOUL',
                location: '반포한강공원',
                sport_id: 5, // Running
                start_time: '19:30:00',
                end_time: '21:00:00',
                days_of_week: [4], // Thursday
                capacity_min: 5,
                capacity_max: 30,
                level_min: 1,
                level_max: 5,
                is_public: true,
                coaching: false
            },
            {
                name: '주말 아침 테니스',
                explain: '토요일 아침 상쾌하게 테니스 치실 분 모십니다. 랠리 가능하신 분!',
                region_code: 'GYEONGGI',
                location: '분당 시립 테니스장',
                sport_id: 3, // Tennis
                start_time: '07:00:00',
                end_time: '09:00:00',
                days_of_week: [6], // Saturday
                capacity_min: 2,
                capacity_max: 8,
                level_min: 2,
                level_max: 4,
                is_public: true,
                coaching: true
            },
            {
                name: '직장인 농구 모임',
                explain: '퇴근 후 스트레스 해소! 실내 체육관 대관해서 진행합니다.',
                region_code: 'SEOUL',
                location: '강남구민회관 체육관',
                sport_id: 1, // Basketball
                start_time: '20:00:00',
                end_time: '22:00:00',
                days_of_week: [2], // Tuesday
                capacity_min: 10,
                capacity_max: 15,
                level_min: 1,
                level_max: 3,
                is_public: false,
                coaching: false
            }
        ];

        for (const club of newClubs) {
            await pool.query(
                `INSERT INTO clubs (
                name, explain, region_code, location, sport_id, 
                owner_user_id, start_time, end_time, days_of_week, 
                capacity_min, capacity_max, level_min, level_max, 
                is_public, coaching
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                [
                    club.name, club.explain, club.region_code, club.location, club.sport_id,
                    ownerId, club.start_time, club.end_time, club.days_of_week,
                    club.capacity_min, club.capacity_max, club.level_min, club.level_max,
                    club.is_public, club.coaching
                ]
            );
        }
        console.log('✅ Seeding completed.');

    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await pool.end();
    }
}

seed();
