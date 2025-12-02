const BASE_URL = 'http://localhost:4000/api';
let accessToken = '';

async function runTest() {
    try {
        console.log('=== Starting Aggregated My Meetings API Test ===');

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

        // 2. Get My Meetings (Aggregated)
        console.log('\n2. Fetching My Meetings (Aggregated)...');
        const res = await fetch(`${BASE_URL}/users/me/meetings`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error(`Get My Meetings failed: ${res.status}`);
        const data = await res.json();
        console.log('My Meetings:', JSON.stringify(data, null, 2));

        // Verify structure
        if (!Array.isArray(data.clubs)) throw new Error('Response missing clubs array');
        if (!Array.isArray(data.flashes)) throw new Error('Response missing flashes array');

        console.log(`\nFound ${data.clubs.length} clubs and ${data.flashes.length} flashes.`);

        // Verify content (optional, based on previous tests)
        if (data.flashes.length > 0) {
            if (!data.flashes[0].date) throw new Error('Flash missing date field');
        }

        console.log('\n=== Test Passed Successfully ===');

    } catch (error) {
        console.error('\nTest Failed:', error);
        process.exit(1);
    }
}

runTest();
