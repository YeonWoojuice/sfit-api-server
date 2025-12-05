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
        console.log(`FAIL: ${method} ${url} ${res.status}`);
        throw new Error('Request failed');
    }
    return data;
}

async function registerUser(name, role = 'USER') {
    const user = {
        username: `u_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}`,
        password: 'password',
        name: name,
        phone: `010-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`,
        email: `u_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}@test.com`
    };
    const authRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    const authData = await authRes.json();
    if (!authData.user) {
        console.log('Register failed:', JSON.stringify(authData));
        throw new Error('Register failed');
    }
    const userId = authData.user.id;

    // Login to get token
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password: user.password })
    });
    const loginData = await loginRes.json();
    if (!loginData.accessToken) {
        console.log('Login failed:', JSON.stringify(loginData));
        throw new Error('Login failed');
    }
    const token = loginData.accessToken;

    if (role !== 'USER') {
        await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, userId]);
    }
    return { userId, token };
}

async function setProfile(userId, region, sports, age, rating = 0) {
    await pool.query(`
        INSERT INTO profiles (user_id, region_code, sports, age, rating)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE 
        SET region_code = $2, sports = $3, age = $4, rating = $5
    `, [userId, region, sports, age, rating]);
}

async function run() {
    try {
        // 1. Create User (SEOUL, Sport [1], Age 30)
        const { userId: myId, token: myToken } = await registerUser('My User');
        await setProfile(myId, 'SEOUL', [1], 30);
        console.log('Created User: SEOUL, Sport [1], Age 30');

        // 2. Create Coach A (Perfect Match: SEOUL, Sport [1], Age 30, Rating 5.0) -> Score 100
        const { userId: coachA } = await registerUser('Coach A', 'COACH');
        await setProfile(coachA, 'SEOUL', [1], 30, 5.0);
        console.log('Created Coach A: Perfect Match');

        // 3. Create Coach B (Partial Match: BUSAN, Sport [1], Age 50, Rating 3.0) -> Score 50 (Sport) + 6 (Rating) = 56
        const { userId: coachB } = await registerUser('Coach B', 'COACH');
        await setProfile(coachB, 'BUSAN', [1], 50, 3.0);
        console.log('Created Coach B: Partial Match');

        // 4. Create Coach C (Low Match: SEOUL, Sport [2], Age 30, Rating 4.0) -> Score 30 (Region) + 10 (Age) + 8 (Rating) = 48
        const { userId: coachC } = await registerUser('Coach C', 'COACH');
        await setProfile(coachC, 'SEOUL', [2], 30, 4.0);
        console.log('Created Coach C: Low Match');

        // 5. Get Recommendations
        // 5. Get Recommendations
        const data = await request(`${BASE_URL}/coach/recommend`, 'GET', myToken);
        console.log('Response Data:', JSON.stringify(data));

        if (!data.recommendations) {
            throw new Error('No recommendations in response');
        }

        console.log('Recommendations:', data.recommendations.map(c => `${c.name}: ${c.score}`).join(', '));

        const topCoach = data.recommendations[0];
        if (topCoach.name === 'Coach A') {
            console.log('✅ Top coach is Coach A.');
        } else {
            console.error(`❌ Top coach is NOT Coach A. It is ${topCoach.name}`);
        }

        if (topCoach.score >= 100) {
            console.log('✅ Score calculation seems correct (>= 100).');
        } else {
            console.error(`❌ Score calculation weird: ${topCoach.score}`);
        }

    } catch (err) {
        console.error('Verification failed:', err);
        require('fs').writeFileSync('error_log.txt', err.stack);
    } finally {
        pool.end();
    }
}

run();
