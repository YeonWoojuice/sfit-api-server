const BASE_URL = 'http://localhost:4000/api';
let accessToken = '';

async function runTest() {
    try {
        console.log('=== Starting Flash Creation Test (Date Field) ===');

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

        // 2. Create Flash with date
        console.log('\n2. Creating Flash with date field...');
        const flashData = {
            name: "날짜 필드 테스트 번개",
            explain: "date 필드로 생성 테스트",
            region_code: "SEOUL",
            sport_id: 1,
            date: "2025-12-25", // [NEW]
            start_time: "14:00",
            end_time: "16:00",
            days_of_week: [4],
            capacity_min: 3,
            capacity_max: 10,
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

        // Verify date field exists and start_at/end_at are removed
        const flash = createResult.flash;
        console.log('Created Flash:', flash);

        if (flash.date !== "2025-12-25") {
            throw new Error(`Expected date to be "2025-12-25", but got ${flash.date}`);
        }
        if (flash.start_at !== undefined || flash.end_at !== undefined) {
            throw new Error('start_at and end_at should be removed from response');
        }

        // 3. List Flashes
        console.log('\n3. Listing Flashes...');
        const listRes = await fetch(`${BASE_URL}/flashes?region=SEOUL&sport=1`);
        const listResult = await listRes.json();
        console.log('List Result:', listResult);

        const listedFlash = listResult.flashes.find(f => f.id === flash.id);
        if (!listedFlash) throw new Error('Created flash not found in list');

        if (listedFlash.date !== "2025-12-25") {
            throw new Error(`List: Expected date to be "2025-12-25", but got ${listedFlash.date}`);
        }
        if (listedFlash.start_at !== undefined || listedFlash.end_at !== undefined) {
            throw new Error('List: start_at and end_at should be removed from response');
        }

        console.log('\n=== Test Passed Successfully ===');

    } catch (error) {
        const fs = require('fs');
        fs.writeFileSync('error_date.txt', error.toString() + '\n' + (error.stack || ''));
        console.error('\nTest Failed:', error);
        process.exit(1);
    }
}

runTest();
