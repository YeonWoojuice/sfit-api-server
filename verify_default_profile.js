const { Pool } = require('pg');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api';

async function run() {
    try {
        const timestamp = Date.now();
        const user = {
            username: `default_profile_${timestamp}`,
            password: 'password',
            name: 'Default Profile Tester',
            phone: '010-3333-4444',
            email: `default_profile_${timestamp}@test.com`
            // No profile fields provided
        };

        console.log('Registering without profile fields...');
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });

        if (!regRes.ok) {
            console.error('❌ Registration failed:', regRes.status, await regRes.text());
            return;
        }
        console.log('✅ Registration successful.');

        console.log('Logging in...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username, password: user.password })
        });
        const loginData = await loginRes.json();
        const token = loginData.accessToken;

        console.log('Getting profile...');
        const getRes = await fetch(`${BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getUser = await getRes.json();
        console.log('Get User:', getUser);

        // Verify defaults
        if (getUser.bio === '반갑습니다!' && getUser.region === '지역 미설정' && getUser.sports === '운동') {
            console.log('✅ Verified: Default profile values were applied.');
        } else {
            console.error('❌ Verification Failed: Defaults not applied.');
            console.error('Expected Defaults: 반갑습니다!, 지역 미설정, 운동');
            console.error('Received:', getUser);
        }

    } catch (err) {
        console.error('Test failed:', err);
    }
}

run();
