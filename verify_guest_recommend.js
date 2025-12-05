const pool = require('./src/config/database');

const BASE_URL = 'http://localhost:4000/api';

async function request(url, method, token = null, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
        // console.log(`FAIL: ${method} ${url} ${res.status}`);
        return { error: true, status: res.status, data };
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
    const token = loginData.accessToken;

    if (role !== 'USER') {
        await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, userId]);
    }
    return { userId, token };
}

async function setProfile(userId, region, sports, age) {
    await pool.query(`
        INSERT INTO profiles (user_id, region_code, sports, age)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE 
        SET region_code = $2, sports = $3, age = $4
    `, [userId, region, sports, age]);
}

async function run() {
    try {
        // 1. Create Coach (Seoul, Tennis(1), Age 30, Rating 5.0)
        const { userId: coachId } = await registerUser('Coach Seoul', 'COACH');
        await setProfile(coachId, 'SEOUL', [1], 30);
        // Manually set rating to 5.0 to ensure high score
        await pool.query('UPDATE profiles SET rating = 5.0 WHERE user_id = $1', [coachId]);
        console.log('Created Coach Seoul (Tennis, 30, Rating 5.0)');

        // 2. Create User (Seoul, Tennis(1), Age 30)
        const { userId: userId, token: userToken } = await registerUser('User Seoul');
        await setProfile(userId, 'SEOUL', [1], 30);
        console.log('Created User Seoul (Tennis, 30)');

        // 3. Test Authenticated Recommendation
        const authData = await request(`${BASE_URL}/coach/recommend`, 'GET', userToken);
        if (authData.recommendations && authData.recommendations.some(c => c.name === 'Coach Seoul')) {
            console.log('✅ Authenticated recommendation success.');
        } else {
            console.error('❌ Authenticated recommendation failed.');
        }

        // 4. Test Guest Recommendation (Matching Params)
        const guestData = await request(`${BASE_URL}/coach/recommend?region=SEOUL&sports=1&age=30`, 'GET');
        if (guestData.recommendations && guestData.recommendations.length > 0) {
            console.log(`✅ Guest recommendation success (Found ${guestData.recommendations.length} matches).`);
            // Optional: Check if at least one match has high score
            if (guestData.recommendations[0].score >= 50) {
                console.log('   Top match has high score (Logic working).');
            }
        } else {
            console.error('❌ Guest recommendation failed (No matches). See guest_rec_debug.json');
            require('fs').writeFileSync('guest_rec_debug.json', JSON.stringify(guestData, null, 2));
        }

        // 5. Test Guest Recommendation (Non-Matching Params: Busan)
        const guestData2 = await request(`${BASE_URL}/coach/recommend?region=BUSAN&sports=2&age=50`, 'GET');
        // Coach Seoul should have low score or be absent if we strictly filter? 
        // The logic sorts by score. Coach Seoul matches nothing -> score 0?
        // Let's check if Coach Seoul is NOT top 1 (or has low score).
        const coachSeoul = guestData2.recommendations?.find(c => c.name === 'Coach Seoul');
        if (!coachSeoul || coachSeoul.score < 50) { // 50 is sport match score
            console.log('✅ Guest recommendation success (Non-Matching).');
        } else {
            console.warn('⚠️ Guest recommendation might be wrong (Non-Matching score high?):', coachSeoul.score);
        }

        // 6. Test Guest Recommendation (Missing Params)
        const failData = await request(`${BASE_URL}/coach/recommend`, 'GET');
        if (failData.error && failData.status === 400) {
            console.log('✅ Guest recommendation failed as expected (Missing Params).');
        } else {
            console.error('❌ Guest recommendation SHOULD fail but didn\'t:', JSON.stringify(failData));
        }

    } catch (err) {
        console.error('Verification failed:', err);
        require('fs').writeFileSync('guest_rec_error_log.txt', err.stack);
    } finally {
        pool.end();
    }
}

run();
