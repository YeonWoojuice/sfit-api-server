const BASE_URL = 'http://localhost:4000/api';
let accessToken = '';

async function runTest() {
    try {
        console.log('=== Starting Flash Creation Test (Level Range) ===');

        // 1. Login
        console.log('\n1. Logging in...');
        let loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser1',
                password: 'password123'
            })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        accessToken = loginData.accessToken;
        console.log('Login successful.');

        // 2. Create Flash with level range
        console.log('\n2. Creating Flash with level_min and level_max...');
        const flashData = {
            name: "레벨 범위 테스트 번개",
            explain: "레벨 1~3만 오세요",
            region_code: "SEOUL",
            sport_id: 1,
            date: "2025-12-26",
            start_time: "18:00",
            end_time: "20:00",
            level_min: 1,
            level_max: 3,
            attachment_id: ""
        };

        const createRes = await fetch(`${BASE_URL}/flashes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(flashData)
        });

        if (!createRes.ok) {
            const err = await createRes.json();
            throw new Error(`Flash creation failed: ${createRes.status} ${JSON.stringify(err)}`);
        }

        const createResult = await createRes.json();
        console.log('Flash created successfully:', createResult);

        const flash = createResult.flash;
        if (flash.level_min !== 1 || flash.level_max !== 3) {
            throw new Error(`Level range mismatch in creation. Expected 1-3, got ${flash.level_min}-${flash.level_max}`);
        }

        // 3. Get Flashes and verify level range
        console.log('\n3. Fetching Flashes to verify level range...');
        const listRes = await fetch(`${BASE_URL}/flashes?region=SEOUL&sport=1`);
        if (!listRes.ok) throw new Error(`Flash list failed: ${listRes.statusText}`);

        const listData = await listRes.json();
        console.log(`Found ${listData.count} flashes.`);

        const foundFlash = listData.flashes.find(f => f.id === flash.id);
        if (!foundFlash) throw new Error('Created flash not found in list');

        console.log('Found flash in list:', {
            id: foundFlash.id,
            level_min: foundFlash.level_min,
            level_max: foundFlash.level_max
        });

        if (foundFlash.level_min !== 1 || foundFlash.level_max !== 3) {
            throw new Error(`Level range mismatch in list. Expected 1-3, got ${foundFlash.level_min}-${foundFlash.level_max}`);
        }

        console.log('\n=== Test Passed Successfully ===');

    } catch (error) {
        const fs = require('fs');
        fs.writeFileSync('error_level.txt', error.toString() + '\n' + (error.stack || ''));
        console.error('\nTest Failed:', error);
        process.exit(1);
    }
}

runTest();
