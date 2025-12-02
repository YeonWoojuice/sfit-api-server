const BASE_URL = 'http://localhost:4000/api';
let accessToken = '';
let flashId = '';

async function runTest() {
    try {
        console.log('=== Starting Flash Location API Test ===');

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

        // 2. Create Flash with location
        console.log('\n2. Creating Flash with location...');
        const createRes = await fetch(`${BASE_URL}/flashes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                name: 'Location Test Flash',
                explain: 'Testing location field',
                sport_id: 1,
                region_code: 'SEOUL',
                location: 'Yeouido Park',
                date: '2025-12-25',
                start_time: '14:00',
                end_time: '16:00',
                level_min: 1,
                level_max: 5,
                capacity_min: 3,
                capacity_max: 10
            })
        });

        if (!createRes.ok) {
            const err = await createRes.json();
            throw new Error(`Create Flash failed: ${JSON.stringify(err)}`);
        }
        const createData = await createRes.json();
        flashId = createData.flash.id;
        console.log('Flash created:', createData.flash);

        if (createData.flash.location !== 'Yeouido Park') throw new Error('Location mismatch in Create response');

        // 3. Get Flash List
        console.log('\n3. Fetching Flash List...');
        const listRes = await fetch(`${BASE_URL}/flashes`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!listRes.ok) throw new Error(`Get Flash List failed: ${listRes.status}`);
        const listData = await listRes.json();
        const foundFlash = listData.flashes.find(f => f.id === flashId);

        if (!foundFlash) throw new Error('Created flash not found in list');
        console.log('Found Flash in List:', foundFlash);
        if (foundFlash.location !== 'Yeouido Park') throw new Error('Location mismatch in List response');

        // 4. Get Flash Detail
        console.log('\n4. Fetching Flash Detail...');
        const detailRes = await fetch(`${BASE_URL}/flashes/${flashId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!detailRes.ok) throw new Error(`Get Flash Detail failed: ${detailRes.status}`);
        const detailData = await detailRes.json();
        console.log('Flash Detail:', detailData);

        if (detailData.location !== 'Yeouido Park') throw new Error('Location mismatch in Detail response');

        console.log('\n=== Test Passed Successfully ===');

    } catch (error) {
        console.error('\nTest Failed:', error);
        process.exit(1);
    }
}

runTest();
