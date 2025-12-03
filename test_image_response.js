const BASE_URL = 'http://localhost:4000/api';
let accessToken = '';

async function runTest() {
    try {
        console.log('=== Starting Image Response Test ===');

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

        const headers = { 'Authorization': `Bearer ${accessToken}` };

        // 2. Check Clubs List
        console.log('\n2. Checking GET /clubs...');
        const clubsRes = await fetch(`${BASE_URL}/clubs`, { headers });
        const clubsData = await clubsRes.json();
        if (clubsData.clubs && clubsData.clubs.length > 0) {
            const club = clubsData.clubs[0];
            console.log(`Club[0] attachment_id: ${club.attachment_id}`);
            console.log(`Club[0] image_url: ${club.image_url}`);
        } else {
            console.log('No clubs found.');
        }

        // 3. Check Flashes List
        console.log('\n3. Checking GET /flashes...');
        const flashesRes = await fetch(`${BASE_URL}/flashes`, { headers });
        const flashesData = await flashesRes.json();
        if (flashesData.flashes && flashesData.flashes.length > 0) {
            const flash = flashesData.flashes[0];
            console.log(`Flash[0] attachment_id: ${flash.attachment_id}`);
            console.log(`Flash[0] image_url: ${flash.image_url}`);
        } else {
            console.log('No flashes found.');
        }

        // 4. Check My History
        console.log('\n4. Checking GET /users/me/history...');
        const historyRes = await fetch(`${BASE_URL}/users/me/history`, { headers });
        const historyData = await historyRes.json();
        if (historyData.length > 0) {
            const item = historyData[0];
            console.log(`History[0] attachment_id: ${item.attachment_id}`);
            console.log(`History[0] image_url: ${item.image_url}`);
        } else {
            console.log('No history found.');
        }

    } catch (error) {
        console.error('\nTest Failed:', error);
    }
}

runTest();
