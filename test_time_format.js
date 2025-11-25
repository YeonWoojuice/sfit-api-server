const fs = require('fs');
const API_URL = 'http://localhost:4000/api';

function log(msg) {
    console.log(msg);
    fs.appendFileSync('test_time_log.txt', msg + '\n');
}

async function testTimeFormat() {
    fs.writeFileSync('test_time_log.txt', '');
    try {
        // 1. Login
        const username = `user_${Date.now()}`;
        const email = `${username}@example.com`;

        // Register
        await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: 'password123', name: 'Test User', phone: '010-1234-5678', email })
        });

        // Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: 'password123' })
        });
        const { accessToken } = await loginRes.json();
        log('Login success');

        // 2. Create Club with Integer Time (e.g., 14 -> 14:00:00)
        log('Testing Club creation with integer time (14, 16)...');
        const clubRes = await fetch(`${API_URL}/clubs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                name: `Club Time Test ${Date.now()}`,
                explain: 'Time test',
                region_code: 'SEOUL',
                sport_id: 1,
                start_time: 14, // Integer
                end_time: 16,   // Integer
                days_of_week: [0, 6],
                capacity_min: 5,
                capacity_max: 20,
                level_min: 1,
                level_max: 5
            })
        });
        const clubData = await clubRes.json();
        if (!clubRes.ok) throw new Error(`Club creation failed: ${JSON.stringify(clubData)}`);
        log(`Club created: start=${clubData.club.start_time}, end=${clubData.club.end_time}`);

        // 3. Create Flash with 24h (e.g., 22 -> 24)
        log('Testing Flash creation with 24h (22, 24)...');
        const now = new Date();
        const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        const endAt = new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString();

        const flashRes = await fetch(`${API_URL}/flashes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                name: `Flash Time Test ${Date.now()}`,
                explain: 'Time test',
                sport_id: 5,
                region_code: 'SEOUL',
                start_at: startAt,
                end_at: endAt,
                start_time: 22, // Integer
                end_time: 24,   // Integer (Should be 24:00:00)
                capacity_min: 3,
                capacity_max: 10
            })
        });
        const flashData = await flashRes.json();
        if (!flashRes.ok) throw new Error(`Flash creation failed: ${JSON.stringify(flashData)}`);
        log(`Flash created: start=${flashData.flash.start_time}, end=${flashData.flash.end_time}`);

    } catch (err) {
        log('Test failed: ' + err);
        console.error(err);
    }
}

testTimeFormat();
