const BASE_URL = 'http://localhost:4000/api';
let accessToken = '';

async function runTest() {
    try {
        console.log('=== Starting Avatar Update Test (Empty String) ===');

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

        // 2. Update Avatar with attachment_id: ""
        console.log('\n2. Updating Avatar with attachment_id: "" ...');
        const updateRes = await fetch(`${BASE_URL}/users/me/avatar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ attachment_id: "" })
        });

        if (!updateRes.ok) {
            const err = await updateRes.json();
            throw new Error(`Avatar update failed: ${updateRes.status} ${JSON.stringify(err)}`);
        }

        const updateResult = await updateRes.json();
        console.log('Avatar updated successfully:', updateResult);

        // 3. Verify Avatar is null
        console.log('\n3. Verifying Avatar is null...');
        const meRes = await fetch(`${BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const meData = await meRes.json();
        console.log('Current Avatar URL:', meData.avatar_url);
        console.log('Current Attachment ID:', meData.attachment_id);

        if (meData.attachment_id !== null) {
            throw new Error('attachment_id should be null');
        }

        console.log('\n=== Test Passed Successfully ===');

    } catch (error) {
        const fs = require('fs');
        fs.writeFileSync('error.txt', error.toString() + '\n' + (error.stack || ''));
        console.error('\nTest Failed:', error);
        process.exit(1);
    }
}

runTest();
