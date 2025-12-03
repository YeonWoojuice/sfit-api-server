const pool = require('./src/config/database');

const BASE_URL = 'http://localhost:4000/api';
let authToken = '';
let clubId = '';
let flashId = '';

async function request(url, method, body = null, headers = {}) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(JSON.stringify(data));
    }
    return data;
}

async function login() {
    try {
        const data = await request(`${BASE_URL}/auth/login`, 'POST', {
            username: 'testuser1',
            password: 'password123'
        });
        authToken = data.accessToken;
        console.log('Login successful');
    } catch (err) {
        console.error('Login failed:', err.message);
        process.exit(1);
    }
}

async function createClub() {
    try {
        const data = await request(`${BASE_URL}/clubs`, 'POST', {
            name: 'Test Club Coaching',
            explain: 'Testing coaching field',
            region_code: 'SEOUL',
            sport_id: 1,
            start_time: '10:00',
            end_time: '12:00',
            coaching: true
        }, { Authorization: `Bearer ${authToken}` });

        clubId = data.club.id;
        console.log('Club created:', clubId);
        console.log('Club coaching:', data.club.coaching);
        if (data.club.coaching !== true) throw new Error('Club coaching mismatch');
    } catch (err) {
        console.error('Create Club failed:', err.message);
    }
}

async function createFlash() {
    try {
        const data = await request(`${BASE_URL}/flashes`, 'POST', {
            name: 'Test Flash Coaching',
            explain: 'Testing coaching field',
            region_code: 'SEOUL',
            sport_id: 1,
            date: '2025-12-25',
            start_time: '14:00',
            end_time: '16:00',
            coaching: true
        }, { Authorization: `Bearer ${authToken}` });

        flashId = data.flash.id;
        console.log('Flash created:', flashId);
        console.log('Flash coaching:', data.flash.coaching);
        if (data.flash.coaching !== true) throw new Error('Flash coaching mismatch');
    } catch (err) {
        console.error('Create Flash failed:', err.message);
    }
}

async function verifyGet() {
    try {
        const clubData = await request(`${BASE_URL}/clubs/${clubId}`, 'GET', null, { Authorization: `Bearer ${authToken}` });
        console.log('GET Club coaching:', clubData.coaching);
        console.log('GET Club rating_avg:', clubData.rating_avg);
    } catch (err) {
        console.error('Verify GET failed:', err.message);
    }
}

async function run() {
    await login();
    await createClub();
    await createFlash();
    await verifyGet();
    pool.end();
}

run();
