const BASE_URL = 'http://localhost:4000/api';
let accessToken = '';

async function runTest() {
    try {
        console.log('=== Starting My Meetings API Test ===');

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

        // 2. Get My Clubs
        console.log('\n2. Fetching My Clubs...');
        const clubsRes = await fetch(`${BASE_URL}/users/me/clubs`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!clubsRes.ok) throw new Error(`Get My Clubs failed: ${clubsRes.status}`);
        const clubs = await clubsRes.json();
        console.log('My Clubs:', clubs);

        // 3. Get My Flashes
        console.log('\n3. Fetching My Flashes...');
        const flashesRes = await fetch(`${BASE_URL}/users/me/flashes`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!flashesRes.ok) throw new Error(`Get My Flashes failed: ${flashesRes.status}`);
        const flashes = await flashesRes.json();
        console.log('My Flashes:', flashes);

        // Verify date field in flashes
        if (flashes.length > 0) {
            const firstFlash = flashes[0];
            if (!firstFlash.date) throw new Error('Flash missing date field');
            if (firstFlash.start_at) throw new Error('Flash should not have start_at field');
            console.log('Flash date verification passed:', firstFlash.date);
        } else {
            console.log('No flashes found for user, skipping date verification.');
        }

        console.log('\n=== Test Passed Successfully ===');

    } catch (error) {
        console.error('\nTest Failed:', error);
        process.exit(1);
    }
}

runTest();
