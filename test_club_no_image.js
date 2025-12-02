const BASE_URL = 'http://localhost:4000/api';
let accessToken = '';

async function runTest() {
    try {
        console.log('=== Starting Club Creation Test (No Image) ===');

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

        // 2. Create Club without attachment_id
        console.log('\n2. Creating Club without attachment_id...');
        const clubData = {
            name: "이미지 없는 동호회",
            explain: "이미지 없이 생성 테스트",
            region_code: "SEOUL",
            sport_id: 1,
            start_time: "10:00",
            end_time: "12:00",
            days_of_week: [1, 3],
            capacity_min: 5,
            capacity_max: 20,
            level_min: 1,
            level_max: 3,
            is_public: true
            // attachment_id is omitted
        };

        const createRes = await fetch(`${BASE_URL}/clubs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(clubData)
        });

        if (!createRes.ok) {
            const err = await createRes.json();
            throw new Error(`Club creation failed: ${createRes.status} ${JSON.stringify(err)}`);
        }

        const createResult = await createRes.json();
        console.log('Club created successfully:', createResult);

        if (createResult.club.attachment_id !== null) {
            throw new Error('attachment_id should be null');
        }

        console.log('\n=== Test Passed Successfully ===');

    } catch (error) {
        console.error('\nTest Failed:', error);
    }
}

runTest();
