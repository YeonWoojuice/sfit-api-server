const { Pool } = require('pg');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api';

async function run() {
    try {
        // 1. Register & Login
        const user = {
            username: `profile_user_${Date.now()}`,
            password: 'password',
            name: 'Profile Tester',
            phone: '010-0000-0000',
            email: `profile_${Date.now()}@test.com`
        };

        console.log('Registering...');
        await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });

        console.log('Logging in...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username, password: user.password })
        });
        const loginData = await loginRes.json();
        const token = loginData.accessToken;

        // 2. Update Profile
        console.log('Updating profile...');
        const updateBody = {
            gender: 'M',
            birthdate: '1990-01-01',
            region: 'Seoul',
            bio: 'Hello World',
            sports: 'Soccer,Tennis'
        };

        const updateRes = await fetch(`${BASE_URL}/auth/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateBody)
        });

        if (updateRes.ok) {
            console.log('✅ Profile update succeeded.');
            const updatedUser = await updateRes.json();
            console.log('Updated User:', updatedUser);

            if (updatedUser.bio === 'Hello World' && updatedUser.gender === 'M') {
                console.log('✅ Verified updated fields.');
            } else {
                console.error('❌ Fields mismatch.');
            }
        } else {
            console.error('❌ Profile update failed:', updateRes.status);
        }

        // 3. Get Profile
        console.log('Getting profile...');
        const getRes = await fetch(`${BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getUser = await getRes.json();
        console.log('Get User:', getUser);

    } catch (err) {
        console.error('Test failed:', err);
    }
}

run();
