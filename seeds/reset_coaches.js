// Clean and recreate proper coach data
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const BASE_URL = 'http://localhost:4000/api';

async function cleanAndCreateCoaches() {
    try {
        console.log('🧹 Cleaning old coach data...');

        // Delete all users with role COACH (except any that might be admin)
        await pool.query(`
            DELETE FROM users 
            WHERE role = 'COACH'
        `);
        console.log('✅ Cleaned old coaches');

        console.log('\n👨‍🏫 Creating new coaches...');

        const coaches = [
            {
                username: 'coach_tennis',
                name: '김테니스',
                phone: '010-1111-1111',
                email: 'coach.tennis@sfit.com',
                region: 'SEOUL',
                sports: [1],
                age: 28,
                intro: '국가대표 출신 테니스 코치입니다. 기초부터 상급까지 체계적으로 지도합니다. 10년 이상의 경력으로 다양한 연령대의 학생들을 가르쳐왔습니다.'
            },
            {
                username: 'coach_baseball',
                name: '이야구',
                phone: '010-2222-2222',
                email: 'coach.baseball@sfit.com',
                region: 'BUSAN',
                sports: [2],
                age: 35,
                intro: '프로야구 10년 경력! 타격, 수비, 투구 모든 분야를 가르쳐드립니다. KBO 출신으로 실전 경험을 바탕으로 한 체계적인 레슨을 제공합니다.'
            },
            {
                username: 'coach_soccer',
                name: '박축구',
                phone: '010-3333-3333',
                email: 'coach.soccer@sfit.com',
                region: 'SEOUL',
                sports: [3],
                age: 30,
                intro: '유럽 리그 출신 축구 코치입니다. 전술과 기본기를 탄탄하게 가르쳐드립니다. 청소년 지도자 자격증 보유.'
            },
            {
                username: 'coach_tabletennis',
                name: '최탁구',
                phone: '010-4444-4444',
                email: 'coach.tabletennis@sfit.com',
                region: 'GYEONGGI',
                sports: [4],
                age: 32,
                intro: '국가대표 탁구 코치 경력 5년. 빠른 실력 향상을 보장합니다. 초보자부터 선수까지 맞춤형 레슨 제공.'
            },
            {
                username: 'coach_badminton',
                name: '정배드민턴',
                phone: '010-5555-5555',
                email: 'coach.badminton@sfit.com',
                region: 'SEOUL',
                sports: [6],
                age: 27,
                intro: '올림픽 메달리스트! 스매시의 정석을 알려드립니다. 체계적인 훈련 프로그램으로 단기간 실력 향상이 가능합니다.'
            }
        ];

        // Create admin account for approval
        console.log('\n👤 Creating admin account...');
        const adminRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin1234',
                name: '관리자',
                phone: '010-0000-0000',
                email: 'admin@sfit.com'
            })
        });
        const adminData = await adminRes.json();

        if (adminData.user) {
            // Make admin
            await pool.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [adminData.user.id]);
            console.log('✅ Admin account created');
        }

        for (const coach of coaches) {
            // 1. Register
            const regRes = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: coach.username,
                    password: 'coach1234',
                    name: coach.name,
                    phone: coach.phone,
                    email: coach.email
                })
            });
            const regData = await regRes.json();

            if (!regData.accessToken) {
                console.log(`❌ Failed to create ${coach.name}`);
                continue;
            }

            const token = regData.accessToken;
            const userId = regData.user.id;

            // 2. Create profile with coach info
            await pool.query(`
                INSERT INTO profiles (user_id, region_code, sports, age, introduction)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (user_id) DO UPDATE SET
                    region_code = $2,
                    sports = $3,
                    age = $4,
                    introduction = $5
            `, [userId, coach.region, coach.sports, coach.age, coach.intro]);

            // 3. Directly make them a coach (skip request/approval for seed data)
            await pool.query(`UPDATE users SET role = 'COACH' WHERE id = $1`, [userId]);

            // 4. Add some rating
            const rating = 4 + Math.random(); // 4.0 ~ 5.0
            await pool.query(`UPDATE profiles SET rating = $1 WHERE user_id = $2`, [rating, userId]);

            console.log(`✅ Created coach: ${coach.name} (${coach.region})`);
        }

        console.log('\n🎉 Coach data creation complete!');
        console.log('\nLogin info:');
        console.log('Admin - Username: admin, Password: admin1234');
        coaches.forEach(c => {
            console.log(`${c.name} - Username: ${c.username}, Password: coach1234`);
        });

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

cleanAndCreateCoaches();
