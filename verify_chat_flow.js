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
        throw new Error('Request failed');
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
        await request(`${BASE_URL}/chat/rooms/${roomId}/messages`, 'POST', tokenA, { content: 'Hello Coach!' });
        console.log('User A sent message');

        // 4. Coach B lists rooms (should see 1 unread)
        const roomsB = await request(`${BASE_URL}/chat/rooms`, 'GET', tokenB);
        const roomForB = roomsB.rooms.find(r => r.id === roomId);
        if (roomForB && roomForB.unread_count === 1) {
            console.log('✅ Coach B sees 1 unread message.');
        } else {
            console.error(`❌ Coach B unread count mismatch: ${roomForB?.unread_count}`);
        }

        // 5. Coach B reads message
        await request(`${BASE_URL}/chat/rooms/${roomId}/read`, 'POST', tokenB);
        console.log('Coach B read message');

        // 6. Coach B lists rooms again (should see 0 unread)
        const roomsB2 = await request(`${BASE_URL}/chat/rooms`, 'GET', tokenB);
        const roomForB2 = roomsB2.rooms.find(r => r.id === roomId);
        if (roomForB2 && roomForB2.unread_count === 0) {
            console.log('✅ Coach B sees 0 unread messages.');
        } else {
            console.error(`❌ Coach B unread count mismatch (after read): ${roomForB2?.unread_count}`);
        }

        // 7. Coach B sends reply
        await request(`${BASE_URL}/chat/rooms/${roomId}/messages`, 'POST', tokenB, { content: 'Hi User!' });
        console.log('Coach B sent reply');

        // 8. User A favorites the room
        const favData = await request(`${BASE_URL}/chat/rooms/${roomId}/favorite`, 'POST', tokenA);
        if (favData.is_favorite) {
            console.log('✅ User A favorited the room.');
        } else {
            console.error('❌ Favorite toggle failed.');
        }

        // 9. User A lists favorites
        const favsA = await request(`${BASE_URL}/chat/rooms?filter=favorite`, 'GET', tokenA);
        if (favsA.rooms.some(r => r.id === roomId)) {
            console.log('✅ Room found in favorites list.');
        } else {
            console.error('❌ Room NOT found in favorites list.');
        }

    } catch (err) {
        console.error('Verification failed:', err);
        require('fs').writeFileSync('chat_error_log.txt', err.stack);
    } finally {
        pool.end();
    }
}

run();
