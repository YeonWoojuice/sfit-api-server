const pool = require('./src/config/database');

const BASE_URL = 'http://localhost:4000/api';

async function request(url, method, token, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(JSON.stringify(data));
    }
    return data;
}

async function run() {
    try {
        // 1. Create User A (The "My" user)
        const userA = {
            username: `userA_${Date.now()}`,
            password: 'password',
            name: 'User A',
            phone: '010-0000-0000',
            email: `usera_${Date.now()}@test.com`
        };
        const authResA = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userA)
        });
        const authDataA = await authResA.json();
        if (!authResA.ok) throw new Error(JSON.stringify(authDataA));

        // Login A
        const loginResA = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userA.username, password: userA.password })
        });
        const loginDataA = await loginResA.json();
        const tokenA = loginDataA.accessToken;
        const userIdA = loginDataA.user.id;

        // 2. Create User B (Other user)
        const userB = {
            username: `userB_${Date.now()}`,
            password: 'password',
            name: 'User B',
            phone: '010-0000-0001',
            email: `userb_${Date.now()}@test.com`
        };
        await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userB)
        });
        const loginResB = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userB.username, password: userB.password })
        });
        const loginDataB = await loginResB.json();
        const userIdB = loginDataB.user.id;

        // 3. Create Flashes
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const futureEndDate = new Date(futureDate);
        futureEndDate.setHours(futureEndDate.getHours() + 2);

        // Flash 1: Hosted by A (Should appear)
        await pool.query(`
            INSERT INTO flash_meetups (
                name, explain, region_code, location, sport_id, 
                start_at, end_at, start_time, end_time, 
                host_user_id, capacity_min, capacity_max, level_min, level_max,
                status, coaching, rating_avg, days_of_week
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'DRAFT', true, 0, '{}')
        `, ['Flash 1 (Host A)', 'Desc', 'SEOUL', 'Loc', 1, futureDate.toISOString(), futureEndDate.toISOString(), '12:00:00', '14:00:00', userIdA, 3, 10, 1, 5]);

        // Flash 2: Hosted by B, A joins (Should appear)
        const res2 = await pool.query(`
            INSERT INTO flash_meetups (
                name, explain, region_code, location, sport_id, 
                start_at, end_at, start_time, end_time, 
                host_user_id, capacity_min, capacity_max, level_min, level_max,
                status, coaching, rating_avg, days_of_week
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'DRAFT', true, 0, '{}')
            RETURNING id
        `, ['Flash 2 (Host B, Join A)', 'Desc', 'SEOUL', 'Loc', 1, futureDate.toISOString(), futureEndDate.toISOString(), '12:00:00', '14:00:00', userIdB, 3, 10, 1, 5]);
        const flashId2 = res2.rows[0].id;

        await pool.query(`
            INSERT INTO flash_attendees (meetup_id, user_id, state)
            VALUES ($1, $2, 'JOINED')
        `, [flashId2, userIdA]);

        // Flash 3: Hosted by B, A not joined (Should NOT appear)
        await pool.query(`
            INSERT INTO flash_meetups (
                name, explain, region_code, location, sport_id, 
                start_at, end_at, start_time, end_time, 
                host_user_id, capacity_min, capacity_max, level_min, level_max,
                status, coaching, rating_avg, days_of_week
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'DRAFT', true, 0, '{}')
        `, ['Flash 3 (Host B, No A)', 'Desc', 'SEOUL', 'Loc', 1, futureDate.toISOString(), futureEndDate.toISOString(), '12:00:00', '14:00:00', userIdB, 3, 10, 1, 5]);

        console.log('Inserted test data.');

        // 4. Call API as User A
        const data = await request(`${BASE_URL}/flashes/my-upcoming`, 'GET', tokenA);
        console.log('My Upcoming Flashes:', data.flashes.length);

        // 5. Verify
        const flash1 = data.flashes.find(f => f.title === 'Flash 1 (Host A)');
        const flash2 = data.flashes.find(f => f.title === 'Flash 2 (Host B, Join A)');
        const flash3 = data.flashes.find(f => f.title === 'Flash 3 (Host B, No A)');

        if (flash1) {
            console.log('✅ Flash 1 found (Hosted).');
            if (flash1.image_url === undefined) console.log('✅ Image URL correctly removed.');
            else console.error('❌ Image URL still present.');
        }
        else console.error('❌ Flash 1 NOT found.');

        if (flash2) console.log('✅ Flash 2 found (Joined).');
        else console.error('❌ Flash 2 NOT found.');

        if (!flash3) console.log('✅ Flash 3 correctly excluded.');
        else console.error('❌ Flash 3 found (Should be excluded).');

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        pool.end();
    }
}

run();
