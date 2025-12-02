const BASE_URL = 'http://localhost:4000/api';
let hostToken = '';
let userToken = '';
let flashId = '';

async function runTest() {
    try {
        console.log('=== Starting Flash Join Logic Test ===');

        // 1. Login as Host
        console.log('\n1. Logging in as Host (testuser1)...');
        let hostLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'testuser1', password: 'password123' })
        });
        if (!hostLogin.ok) throw new Error('Host login failed');
        hostToken = (await hostLogin.json()).accessToken;

        // 2. Login as User (testuser2)
        console.log('Logging in as User (testuser2)...');
        let userLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'testuser2', password: 'password123' })
        });

        // If login fails, try signup then login
        if (!userLogin.ok) {
            console.log('User login failed, trying signup...');
            const signupRes = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'testuser2', password: 'password123', name: 'User2', email: 'u2@test.com', phone: '010-2222-2222' })
            });

            if (!signupRes.ok) {
                const text = await signupRes.text();
                console.log(`Signup failed (${signupRes.status}):`, text);
            }

            userLogin = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'testuser2', password: 'password123' })
            });
        }

        if (!userLogin.ok) {
            const err = await userLogin.json();
            throw new Error(`User login failed after signup attempt: ${JSON.stringify(err)}`);
        }
        userToken = (await userLogin.json()).accessToken;

        // 3. Create Flash (Level 1-3, Capacity 2)
        console.log('\n2. Creating Flash (Level 1-3, Cap 2)...');
        const flashData = {
            name: "참가 테스트 번개",
            explain: "테스트용",
            region_code: "SEOUL",
            sport_id: 1,
            date: "2025-12-30",
            start_time: "10:00",
            end_time: "12:00",
            level_min: 1,
            level_max: 3,
            capacity_max: 2,
            attachment_id: ""
        };
        const createRes = await fetch(`${BASE_URL}/flashes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hostToken}` },
            body: JSON.stringify(flashData)
        });
        if (!createRes.ok) throw new Error('Flash creation failed');
        flashId = (await createRes.json()).flash.id;
        console.log('Flash created:', flashId);

        // 4. Test: Host joining own flash (Should Fail)
        console.log('\n3. Test: Host joining own flash...');
        const hostJoinRes = await fetch(`${BASE_URL}/flashes/${flashId}/join`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${hostToken}` }
        });
        if (hostJoinRes.status === 409) {
            console.log('-> Passed: Host cannot join own flash');
        } else {
            throw new Error(`Failed: Host join status ${hostJoinRes.status}`);
        }

        // 5. Test: User joining (Should Success)
        console.log('\n4. Test: User joining...');
        // Ensure user has profile with level 1
        await fetch(`${BASE_URL}/users/me`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
            body: JSON.stringify({ level: 1, region_code: 'SEOUL', sports: [1] })
        });

        const userJoinRes = await fetch(`${BASE_URL}/flashes/${flashId}/join`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (userJoinRes.ok) {
            console.log('-> Passed: User joined successfully');
        } else {
            const err = await userJoinRes.json();
            throw new Error(`Failed: User join failed ${userJoinRes.status} ${JSON.stringify(err)}`);
        }

        // 6. Test: Duplicate Join (Should Fail)
        console.log('\n5. Test: Duplicate Join...');
        const dupJoinRes = await fetch(`${BASE_URL}/flashes/${flashId}/join`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (dupJoinRes.status === 409) {
            console.log('-> Passed: Duplicate join prevented');
        } else {
            throw new Error(`Failed: Duplicate join status ${dupJoinRes.status}`);
        }

        console.log('\n=== Test Passed Successfully ===');

    } catch (error) {
        const fs = require('fs');
        fs.writeFileSync('error_join.txt', error.toString() + '\n' + (error.stack || ''));
        console.error('\nTest Failed:', error);
        process.exit(1);
    }
}

runTest();
