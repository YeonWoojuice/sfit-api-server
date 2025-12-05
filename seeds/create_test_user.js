// Create test account and join clubs/flashes
const BASE_URL = 'http://localhost:4000/api';

async function createTestUser() {
    try {
        console.log('🧪 Creating test account...');

        // 1. Create test user
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `testuser_${Date.now()}`,
                password: 'test1234',
                name: '테스트유저',
                phone: '010-9999-9999',
                email: `testuser_${Date.now()}@test.com`
            })
        });
        const userData = await registerRes.json();

        if (!userData.accessToken) {
            console.error('❌ Failed to create user:', userData);
            return;
        }

        console.log('✅ Test user created:', userData.user.username);
        const token = userData.accessToken;

        // 2. Get available clubs
        const clubsRes = await fetch(`${BASE_URL}/clubs`);
        const clubsData = await clubsRes.json();
        const clubs = clubsData.clubs || [];

        if (clubs.length === 0) {
            console.log('⚠️  No clubs available');
        } else {
            // Join first club
            const club = clubs[0];
            const joinRes = await fetch(`${BASE_URL}/clubs/${club.id}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const joinData = await joinRes.json();
            console.log(`✅ Joined club: ${club.name} - ${joinData.message}`);
        }

        // 3. Get available flash meetups
        const flashesRes = await fetch(`${BASE_URL}/flashes`);
        const flashesData = await flashesRes.json();
        const flashes = flashesData.flashes || [];

        if (flashes.length < 3) {
            console.log(`⚠️  Only ${flashes.length} flash meetups available (need 3)`);
        }

        // Join up to 3 flashes
        const flashesToJoin = flashes.slice(0, 3);
        for (const flash of flashesToJoin) {
            const joinRes = await fetch(`${BASE_URL}/flashes/${flash.id}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const joinData = await joinRes.json();
            console.log(`✅ Joined flash: ${flash.name} - ${joinData.message}`);
        }

        console.log('\n🎉 Test user setup complete!');
        console.log(`Username: ${userData.user.username}`);
        console.log(`Password: test1234`);
        console.log(`Token: ${token}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

createTestUser().then(() => process.exit(0)).catch(() => process.exit(1));
