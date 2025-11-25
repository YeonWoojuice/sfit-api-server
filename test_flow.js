const fs = require('fs');
const API_URL = 'http://localhost:4000/api';

function log(msg) {
    console.log(msg);
    fs.appendFileSync('test_log.txt', msg + '\n');
}

async function testFlow() {
    fs.writeFileSync('test_log.txt', ''); // Clear log
    try {
        // 1. Register
        const username = `user_${Date.now()}`;
        const email = `${username}@example.com`;
        log(`Registering user: ${username}`);

        let res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password: 'password123',
                name: 'Test User',
                phone: '010-1234-5678',
                email
            })
        });
        let data = await res.json();
        if (!res.ok) throw new Error(`Register failed: ${JSON.stringify(data)}`);
        log('Register success: ' + JSON.stringify(data));

        log('Waiting 1s before login...');
        await new Promise(r => setTimeout(r, 1000));

        // 2. Login
        log('Logging in...');
        res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password: 'password123'
            })
        });

        const text = await res.text();
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Login response not JSON: ${text}`);
        }

        if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(data)}`);
        log('Login success');
        const { accessToken } = data;

        // 3. Get Me
        log('Getting profile...');
        res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error(`Get Me failed: ${res.status}`);
        data = await res.json();
        log('Profile: ' + JSON.stringify(data));

        // 4. Create Club
        log('Creating club...');
        res = await fetch(`${API_URL}/clubs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                name: `Club ${Date.now()}`,
                explain: 'This is a test club',
                region_code: 'SEOUL_GANGNAM',
                sport_id: 1,
                start_time: '10:00',
                end_time: '12:00',
                days_of_week: [0, 6],
                capacity_min: 5,
                capacity_max: 20,
                level_min: 1, // Integer check
                level_max: 5  // Integer check
            })
        });
        data = await res.json();
        if (!res.ok) throw new Error(`Create Club failed: ${JSON.stringify(data)}`);
        log('Club created: ' + JSON.stringify(data));

        // 5. List Clubs
        log('Listing clubs...');
        res = await fetch(`${API_URL}/clubs`);
        data = await res.json();
        log(`Found ${data.count} clubs`);

        // 6. Create Flash Meetup
        log('Creating flash meetup...');
        const now = new Date();
        const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
        const endAt = new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString(); // Tomorrow + 2h

        res = await fetch(`${API_URL}/flashes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                name: `Flash ${Date.now()}`,
                explain: 'Quick run',
                sport_id: 5, // Running
                region_code: 'SEOUL_MAPO',
                start_at: startAt,
                end_at: endAt,
                start_time: '19:00',
                end_time: '21:00',
                capacity_min: 3,
                capacity_max: 10
            })
        });
        data = await res.json();
        if (!res.ok) throw new Error(`Create Flash failed: ${JSON.stringify(data)}`);
        log('Flash created: ' + JSON.stringify(data));

        // 7. List Flashes
        log('Listing flashes...');
        res = await fetch(`${API_URL}/flashes`);
        data = await res.json();
        log(`Found ${data.count} flashes`);

        // 8. User Profile Update
        log('Updating profile...');
        res = await fetch(`${API_URL}/users/me`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                age: 25,
                gender: 'M',
                region_code: 'SEOUL_GANGNAM',
                level: '중급',
                sports: [1, 2]
            })
        });
        data = await res.json();
        if (!res.ok) throw new Error(`Update Profile failed: ${JSON.stringify(data)}`);
        log('Profile updated: ' + JSON.stringify(data));

        // 9. Admin Dashboard
        log('Checking Admin Dashboard...');
        res = await fetch(`${API_URL}/admin/dashboard`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.status === 403) {
            log('Admin access denied as expected (User role)');
        } else {
            data = await res.json();
            log('Admin Dashboard: ' + JSON.stringify(data));
        }

    } catch (err) {
        log('Test failed: ' + err);
        console.error(err);
    }
}

testFlow();
