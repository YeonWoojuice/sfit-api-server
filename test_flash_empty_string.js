const BASE_URL = 'http://localhost:4000/api';
let accessToken = '';

async function runTest() {
    try {
        console.log('=== Starting Flash Creation Test (Empty String Image) ===');

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

        // 2. Create Flash with attachment_id: ""
        console.log('\n2. Creating Flash with attachment_id: "" ...');
        const flashData = {
            name: "빈 문자열 이미지 번개",
            explain: "이미지 ID 빈 문자열 테스트",
            region_code: "SEOUL",
            sport_id: 1,
            start_at: "2025-12-25T10:00:00.000Z",
            end_at: "2025-12-25T12:00:00.000Z",
            start_time: "10:00",
            end_time: "12:00",
            days_of_week: [1],
            capacity_min: 3,
            capacity_max: 10,
            attachment_id: "" // Empty string
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

        if (createResult.flash.attachment_id !== null) {
            throw new Error('attachment_id should be null');
        }

        console.log('\n=== Test Passed Successfully ===');

    } catch (error) {
        console.error('\nTest Failed:', error);
    }
}

runTest();
