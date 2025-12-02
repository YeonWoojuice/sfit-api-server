const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4000/api';
let accessToken = '';
let userId = '';
let attachmentId = '';

async function runTest() {
    try {
        console.log('=== Starting My Page API Test ===');

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

        if (!loginRes.ok) {
            console.log('Login failed, trying to register...');
            await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'testuser1',
                    password: 'password123',
                    name: 'Test User',
                    phone: '010-1234-5678',
                    email: 'testuser1@example.com'
                })
            });
            loginRes = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'testuser1',
                    password: 'password123'
                })
            });
        }

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        accessToken = loginData.accessToken;
        userId = loginData.user.id;
        console.log('Login successful. Token:', accessToken.substring(0, 20) + '...');

        const headers = { Authorization: `Bearer ${accessToken}` };

        // 2. Upload Image (Mock)
        console.log('\n2. Uploading Image...');
        const dummyFilePath = path.join(__dirname, 'test_image.jpg');
        if (!fs.existsSync(dummyFilePath)) {
            fs.writeFileSync(dummyFilePath, 'dummy image content');
        }

        const fileContent = fs.readFileSync(dummyFilePath);
        const blob = new Blob([fileContent], { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', blob, 'test_image.jpg');

        const uploadRes = await fetch(`${BASE_URL}/attachments`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` }, // fetch automatically sets Content-Type for FormData
            body: formData
        });

        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.statusText}`);
        const uploadData = await uploadRes.json();
        attachmentId = uploadData.id;
        console.log('Image uploaded. ID:', attachmentId);

        // 3. Update Profile (Avatar)
        console.log('\n3. Updating Avatar...');
        const avatarRes = await fetch(`${BASE_URL}/users/me/avatar`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ attachment_id: attachmentId })
        });
        if (!avatarRes.ok) throw new Error(`Avatar update failed: ${avatarRes.statusText}`);
        console.log('Avatar updated.');

        // 4. Update Profile (Info)
        console.log('\n4. Updating Profile Info...');
        const updateRes = await fetch(`${BASE_URL}/users/me`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                introduction: 'Hello, I am a test user!',
                region_code: 'SEOUL',
                sports: [1, 2],
                level: '중급'
            })
        });
        if (!updateRes.ok) throw new Error(`Profile update failed: ${updateRes.statusText}`);
        console.log('Profile info updated.');

        // 5. Get Me
        console.log('\n5. Fetching My Profile...');
        const meRes = await fetch(`${BASE_URL}/users/me`, { headers });
        if (!meRes.ok) throw new Error(`Get Me failed: ${meRes.statusText}`);
        const meData = await meRes.json();
        console.log('My Profile:', meData);

        if (meData.introduction !== 'Hello, I am a test user!') throw new Error('Introduction mismatch');
        if (meData.attachment_id !== attachmentId) throw new Error('Attachment ID mismatch');
        if (!meData.avatar_url) throw new Error('Avatar URL missing');

        // 6. Get My Clubs
        console.log('\n6. Fetching My Clubs...');
        const clubsRes = await fetch(`${BASE_URL}/users/me/clubs`, { headers });
        if (!clubsRes.ok) throw new Error(`Get Clubs failed: ${clubsRes.statusText}`);
        const clubsData = await clubsRes.json();
        console.log('My Clubs Count:', clubsData.length);

        // 7. Get My Flashes
        console.log('\n7. Fetching My Flashes...');
        const flashesRes = await fetch(`${BASE_URL}/users/me/flashes`, { headers });
        if (!flashesRes.ok) throw new Error(`Get Flashes failed: ${flashesRes.statusText}`);
        const flashesData = await flashesRes.json();
        console.log('My Flashes Count:', flashesData.length);

        console.log('\n=== Test Passed Successfully ===');

    } catch (error) {
        console.error('\nTest Failed:', error);
    }
}

runTest();
