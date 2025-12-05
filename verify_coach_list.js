const pool = require('./src/config/database');

const BASE_URL = 'http://localhost:4000/api';

async function run() {
    try {
        // 1. Create a Coach User manually (since verify API needs certificate which is hard to mock without inserting into coach_certifications)
        // Or just update an existing user to COACH role.

        const user = {
            username: `coach_${Date.now()}`,
            password: 'password',
            name: 'Coach Kim',
            phone: '010-9999-9999',
            email: `coach_${Date.now()}@test.com`
        };

        // Register
        const authRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        const authData = await authRes.json();
        const userId = authData.user.id;
        const token = authData.accessToken;

        console.log('Created user:', userId);

        // Update role to COACH directly in DB
        await pool.query("UPDATE users SET role = 'COACH' WHERE id = $1", [userId]);

        // Add profile info
        await pool.query(`
            INSERT INTO profiles (user_id, introduction, region_code, sports)
            VALUES ($1, 'I am a pro coach.', 'SEOUL', $2)
            ON CONFLICT (user_id) DO UPDATE 
            SET introduction = 'I am a pro coach.', region_code = 'SEOUL', sports = $2
        `, [userId, [1]]);

        console.log('Updated user to COACH.');

        // 2. Call GET /api/coach
        const res = await fetch(`${BASE_URL}/coach`);
        const data = await res.json();

        console.log('GET /api/coach response:', JSON.stringify(data, null, 2));

        if (data.coaches && data.coaches.some(c => c.id === userId)) {
            console.log('✅ Coach found in list.');
            const coach = data.coaches.find(c => c.id === userId);
            if (coach.introduction === 'I am a pro coach.') console.log('✅ Profile info correct.');
            else console.error('❌ Profile info mismatch.');
        } else {
            console.error('❌ Coach NOT found in list.');
        }

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        pool.end();
    }
}

run();
