const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function seedSampleData() {
    try {
        console.log('🌱 Starting seed...');

        // 1. Create host users
        const hostResult = await pool.query(`
            INSERT INTO users (id, username, password, name, email, phone, role)
            VALUES 
                (gen_random_uuid(), 'host1', '$2b$10$abcdefghijklmnopqrstuv', '김호스트', 'host1@test.com', '010-1111-1111', 'USER'),
                (gen_random_uuid(), 'host2', '$2b$10$abcdefghijklmnopqrstuv', '이리더', 'host2@test.com', '010-2222-2222', 'USER')
            ON CONFLICT (username) DO NOTHING
            RETURNING id
        `);

        const hostIds = hostResult.rows.length > 0
            ? hostResult.rows.map(r => r.id)
            : (await pool.query(`SELECT id FROM users WHERE username IN ('host1', 'host2')`)).rows.map(r => r.id);

        console.log('✅ Host users created');

        // 2. Create clubs
        const clubResult = await pool.query(`
            INSERT INTO clubs (id, name, explain, region_code, location, sport_id, level_limit, host_id, created_at)
            VALUES 
                (gen_random_uuid(), '서울 테니스 클럽', '매주 주말 테니스를 즐기는 모임입니다', 'SEOUL', '올림픽공원 테니스장', 1, ARRAY[1,2,3], $1, NOW()),
                (gen_random_uuid(), '부산 야구 동호회', '야구를 사랑하는 사람들의 모임', 'BUSAN', '사직야구장', 2, ARRAY[2,3,4], $2, NOW()),
                (gen_random_uuid(), '경기 축구 클럽', '주말 축구 경기를 함께 즐깁니다', 'GYEONGGI', '수원종합운동장', 3, ARRAY[1,2,3,4,5], $1, NOW())
            RETURNING id, name
        `, [hostIds[0], hostIds[1] || hostIds[0]]);

        console.log(`✅ Created ${clubResult.rows.length} clubs:`, clubResult.rows.map(r => r.name).join(', '));

        // 3. Create flash meetups
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);

        const flashResult = await pool.query(`
            INSERT INTO flash_meetups (id, name, explain, region_code, location, sport_id, level_limit, host_id, meetup_date, start_time, end_time, max_participants, created_at)
            VALUES 
                (gen_random_uuid(), '한강 러닝 번개', '가볍게 뛰실 분들 모여요!', 'SEOUL', '여의도 한강공원', 5, ARRAY[1,2,3], $1, $2, '10:00', '12:00', 10, NOW()),
                (gen_random_uuid(), '탁구 번개 모임', '탁구 치실 분 구합니다', 'SEOUL', '강남구민회관', 4, ARRAY[2,3,4], $3, $4, '14:00', '16:00', 8, NOW()),
                (gen_random_uuid(), '배드민턴 친선전', '배드민턴 함께 쳐요', 'GYEONGGI', '분당 체육관', 6, ARRAY[1,2,3,4,5], $1, $5, '18:00', '20:00', 12, NOW())
            RETURNING id, name
        `, [hostIds[0], tomorrow, hostIds[1] || hostIds[0], nextWeek, nextMonth]);

        console.log(`✅ Created ${flashResult.rows.length} flash meetups:`, flashResult.rows.map(r => r.name).join(', '));

        console.log('🎉 Seed completed!');

    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        throw err;
    } finally {
        pool.end();
    }
}

// Run seed
seedSampleData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
