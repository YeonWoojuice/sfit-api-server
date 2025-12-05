const pool = require('./src/config/database');

const BASE_URL = 'http://localhost:4000/api';

async function request(url, method, token, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
        console.log(`FAIL: ${method} ${url} ${res.status}`);
        // throw new Error('Request failed'); // Don't throw here to allow testing negative cases
        return { error: true, status: res.status, data };
    }
    return data;
}

async function registerUser(name) {
    const user = {
        username: `u_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}`,
        password: 'password',
        name: name,
        phone: `010-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`,
        email: `u_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}@test.com`
    };
    const authRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    const authData = await authRes.json();
    if (!authData.user) {
        console.log('Register failed:', JSON.stringify(authData));
        throw new Error('Register failed');
    }

    // Login to get token
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password: user.password })
    });
    const loginData = await loginRes.json();
    return { userId: authData.user.id, token: loginData.accessToken };
}

async function run() {
    try {
        // 1. Create User A and Coach B
        const { userId: userA, token: tokenA } = await registerUser('User A');
        const { userId: coachB, token: tokenB } = await registerUser('Coach B');
        console.log('Created User A and Coach B');

        // 2. User A creates room with Coach B
        const roomData = await request(`${BASE_URL}/chat/rooms`, 'POST', tokenA, { targetId: coachB });
        const roomId = roomData.room_id;
        console.log(`Room created: ${roomId}`);

        // 3. User A sends message
        const msgData = await request(`${BASE_URL}/chat/rooms/${roomId}/messages`, 'POST', tokenA, { content: 'Original Message' });
        const messageId = msgData.data.id;
        console.log(`User A sent message: ${messageId}`);

        // 4. User A edits message
        const editData = await request(`${BASE_URL}/chat/rooms/${roomId}/messages/${messageId}`, 'PUT', tokenA, { content: 'Edited Message' });
        if (editData.message === 'Updated' && editData.data.content === 'Edited Message') {
            console.log('✅ User A successfully edited message.');
        } else {
            console.error('❌ Edit failed:', JSON.stringify(editData));
        }

        // 5. Verify update in history
        const history = await request(`${BASE_URL}/chat/rooms/${roomId}/messages`, 'GET', tokenA);
        const updatedMsg = history.messages.find(m => m.id === messageId);
        if (updatedMsg && updatedMsg.content === 'Edited Message') {
            console.log('✅ History shows updated content.');
        } else {
            console.error('❌ History shows OLD content:', updatedMsg?.content);
        }

        // 6. Coach B tries to edit User A's message (Should Fail)
        const failEdit = await request(`${BASE_URL}/chat/rooms/${roomId}/messages/${messageId}`, 'PUT', tokenB, { content: 'Hacked Message' });
        if (failEdit.error && failEdit.status === 403) {
            console.log('✅ Coach B cannot edit User A\'s message (403 Forbidden).');
        } else {
            console.error('❌ Coach B WAS ABLE to edit or got wrong error:', JSON.stringify(failEdit));
        }

    } catch (err) {
        console.error('Verification failed:', err);
        require('fs').writeFileSync('edit_error_log.txt', err.stack);
    } finally {
        pool.end();
    }
}

run();
