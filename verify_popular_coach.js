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

async function setProfile(userId, rating) {
    await pool.query(`
        INSERT INTO profiles (user_id, rating)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE 
        SET rating = $2
    `, [userId, rating]);
}

async function run() {
    try {
        // 1. Create User (Observer)
        const { token: userToken } = await registerUser('Observer');

        // 2. Create Coaches with different ratings
        const coaches = [
            { name: 'Coach 5.0', rating: 5.0 },
            { name: 'Coach 3.0', rating: 3.0 },
            { name: 'Coach 4.5', rating: 4.5 },
            { name: 'Coach 1.0', rating: 1.0 },
            { name: 'Coach 4.0', rating: 4.0 }
        ];

        for (const c of coaches) {
            const { userId } = await registerUser(c.name, 'COACH');
            await setProfile(userId, c.rating);
            console.log(`Created ${c.name} with rating ${c.rating}`);
        }

        // 3. Get Popular Coaches
        const data = await request(`${BASE_URL}/coach/popular`, 'GET', userToken);

        if (Array.isArray(data)) {
            console.log(`Fetched ${data.length} popular coaches.`);

            // Check sorting
            let sorted = true;
            for (let i = 0; i < data.length - 1; i++) {
                if (data[i].rating < data[i + 1].rating) {
                    sorted = false;
                    console.error(`❌ Sorting error: ${data[i].name} (${data[i].rating}) < ${data[i + 1].name} (${data[i + 1].rating})`);
                    break;
                }
            }

            if (sorted) {
                console.log('✅ Coaches are sorted by rating DESC.');
                console.log('Top 3:', data.slice(0, 3).map(c => `${c.name} (${c.rating})`).join(', '));
            }

        } else {
            console.error('❌ Response is not an array:', JSON.stringify(data));
        }

    } catch (err) {
        console.error('Verification failed:', err);
        require('fs').writeFileSync('popular_error_log.txt', err.stack);
    } finally {
        pool.end();
    }
}

run();
