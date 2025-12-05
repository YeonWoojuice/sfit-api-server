// Join clubs and flashes with existing testuser1 account
const BASE_URL = 'http://localhost:4000/api';

async function joinWithTestUser() {
    try {
        console.log('🔐 Logging in as testuser1...');

        // 1. Login
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser1',
                password: 'password123'
            })
        });
        const loginData = await loginRes.json();

        if (!loginData.accessToken) {
            console.error('❌ Login failed:', loginData);
            return;
        }

        console.log('✅ Logged in successfully');
        const token = loginData.accessToken;

        // 2. Get available clubs
        const clubsRes = await fetch(`${BASE_URL}/clubs`);
        const clubsData = await clubsRes.json();
        const clubs = clubsData.clubs || [];

        if (clubs.length === 0) {
            console.log('⚠️  No clubs available');
        } else {
            // Join first club
            const club = clubs[0];
            try {
                const joinRes = await fetch(`${BASE_URL}/clubs/${club.id}/join`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                const joinData = await joinRes.json();
                console.log(`✅ Joined club: ${club.name}`);
            } catch (e) {
                console.log(`⚠️  Already member of: ${club.name}`);
            }
        }

        // 3. Get available flash meetups
        const flashesRes = await fetch(`${BASE_URL}/flashes`);
        const flashesData = await flashesRes.json();
        const flashes = flashesData.flashes || [];

        if (flashes.length < 3) {
            console.log(`⚠️  Only ${flashes.length} flash meetups available`);
        }

        // Join up to 3 flashes
        const flashesToJoin = flashes.slice(0, 3);
        for (const flash of flashesToJoin) {
            try {
                const joinRes = await fetch(`${BASE_URL}/flashes/${flash.id}/join`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                const joinData = await joinRes.json();
                console.log(`✅ Joined flash: ${flash.name}`);
            } catch (e) {
                console.log(`⚠️  Already attending: ${flash.name}`);
            }
        }

        console.log('\n🎉 testuser1 activity setup complete!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

joinWithTestUser().then(() => process.exit(0)).catch(() => process.exit(1));
