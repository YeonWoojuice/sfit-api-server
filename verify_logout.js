const BASE_URL = 'http://localhost:4000/api';

async function run() {
    try {
        // 1. Create User
        const user = {
            username: `logout_user_${Date.now()}`,
            password: 'password',
            name: 'Logout User',
            phone: '010-0000-0000',
            email: `logout_${Date.now()}@test.com`
        };
        console.log(`Created user: ${user.username}`);
        await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });

        // 2. Login
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username, password: user.password })
        });
        const loginData = await loginRes.json();
        const refreshToken = loginData.refreshToken;
        console.log('Login successful. Got refresh token.');

        // 3. Refresh (Should succeed)
        const refreshRes1 = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        if (refreshRes1.ok) {
            console.log('✅ Initial refresh succeeded.');
        } else {
            console.error('❌ Initial refresh failed.');
        }

        // Let's re-login to get a fresh token for the logout test
        const loginRes2 = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username, password: user.password })
        });
        const loginData2 = await loginRes2.json();
        const tokenToRevoke = loginData2.refreshToken;
        require('fs').appendFileSync('debug_client.log', `Token to revoke: ${tokenToRevoke}\n`);

        // 4. Logout
        const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: tokenToRevoke })
        });
        if (logoutRes.status === 204) {
            console.log('✅ Logout request succeeded (204).');
        } else {
            console.error('❌ Logout request failed:', logoutRes.status);
        }

        // 5. Try to Refresh with revoked token (Should fail)
        const refreshRes2 = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: tokenToRevoke })
        });

        if (refreshRes2.status === 403) {
            console.log('✅ Refresh with revoked token failed (403) as expected.');
        } else {
            console.error('❌ Refresh with revoked token unexpected status:', refreshRes2.status);
        }

    } catch (err) {
        console.error('Verification failed:', err);
    }
}

run();
