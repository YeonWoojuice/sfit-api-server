// Comprehensive seed data for coaches, chat, and activity history
const BASE_URL = 'http://localhost:4000/api';

async function seedComprehensiveData() {
    try {
        console.log('🌱 Starting comprehensive seed...\n');

        // ==================== 1. CREATE USERS ====================
        console.log('📝 Creating users...');

        // Create regular users
        const users = [];
        for (let i = 1; i <= 3; i++) {
            const res = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: `user${i}_${Date.now()}`,
                    password: 'password123',
                    name: `일반유저${i}`,
                    phone: `010-1234-567${i}`,
                    email: `user${i}_${Date.now()}@test.com`
                })
            });
            const data = await res.json();
            if (data.accessToken) {
                users.push({ ...data.user, token: data.accessToken });
                console.log(`✅ Created user: ${data.user.username}`);
            }
        }

        // Create coaches
        const coaches = [];
        const coachData = [
            { name: '김테니스', region: 'SEOUL', sports: [1], age: 28, intro: '테니스 국가대표 출신 코치입니다. 초보자부터 상급자까지 환영합니다!' },
            { name: '이야구', region: 'BUSAN', sports: [2], age: 35, intro: '프로야구 10년 경력! 타격, 수비 모두 가르쳐드립니다.' },
            { name: '박축구', region: 'SEOUL', sports: [3], age: 30, intro: '유럽 리그 출신 축구 코치. 전술과 기본기를 탄탄하게!' },
            { name: '최탁구', region: 'GYEONGGI', sports: [4], age: 32, intro: '국가대표 탁구 코치 경력 5년. 빠른 실력 향상 보장!' },
            { name: '정배드민턴', region: 'SEOUL', sports: [6], age: 27, intro: '올림픽 메달리스트! 스매시의 정석을 알려드립니다.' }
        ];

        for (let i = 0; i < coachData.length; i++) {
            const coach = coachData[i];
            const res = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: `coach${i + 1}_${Date.now()}`,
                    password: 'password123',
                    name: coach.name,
                    phone: `010-2000-000${i + 1}`,
                    email: `coach${i + 1}_${Date.now()}@test.com`
                })
            });
            const data = await res.json();
            if (data.accessToken) {
                // Create profile for coach
                await fetch(`${BASE_URL}/users/profile`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${data.accessToken}`
                    },
                    body: JSON.stringify({
                        region_code: coach.region,
                        sports: coach.sports,
                        age: coach.age,
                        introduction: coach.intro
                    })
                });

                // Request coach verification
                await fetch(`${BASE_URL}/coach/request`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${data.accessToken}`
                    },
                    body: JSON.stringify({
                        introduction: coach.intro,
                        sports: coach.sports
                    })
                });

                coaches.push({ ...data.user, token: data.accessToken, ...coach });
                console.log(`✅ Created coach: ${coach.name}`);
            }
        }

        // ==================== 2. JOIN CLUBS & FLASHES ====================
        console.log('\n🏃 Creating activity history...');

        // Get existing clubs
        const clubsRes = await fetch(`${BASE_URL}/clubs`);
        const clubsData = await clubsRes.json();
        const clubs = clubsData.clubs || [];

        // Get existing flashes
        const flashesRes = await fetch(`${BASE_URL}/flashes`);
        const flashesData = await flashesRes.json();
        const flashes = flashesData.flashes || [];

        // Users join clubs
        for (const user of users) {
            // Join 1-2 clubs
            const clubsToJoin = clubs.slice(0, Math.floor(Math.random() * 2) + 1);
            for (const club of clubsToJoin) {
                try {
                    await fetch(`${BASE_URL}/clubs/${club.id}/join`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user.token}`
                        }
                    });
                    console.log(`  - ${user.name} joined club: ${club.name}`);
                } catch (e) { }
            }

            // Join 1-2 flashes
            const flashesToJoin = flashes.slice(0, Math.floor(Math.random() * 2) + 1);
            for (const flash of flashesToJoin) {
                try {
                    await fetch(`${BASE_URL}/flashes/${flash.id}/join`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user.token}`
                        }
                    });
                    console.log(`  - ${user.name} joined flash: ${flash.name}`);
                } catch (e) { }
            }
        }

        // ==================== 3. CREATE CHAT ROOMS & MESSAGES ====================
        console.log('\n💬 Creating chat rooms and messages...');

        if (users.length >= 2) {
            // Create chat room between user1 and user2
            const chatRes = await fetch(`${BASE_URL}/chat/rooms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${users[0].token}`
                },
                body: JSON.stringify({
                    participant_id: users[1].id
                })
            });
            const chatData = await chatRes.json();

            if (chatData.room_id) {
                console.log(`✅ Created chat room between ${users[0].name} and ${users[1].name}`);

                // Send messages
                const messages = [
                    { sender: users[0], text: '안녕하세요! 동호회 활동 재밌게 하고 계시나요?' },
                    { sender: users[1], text: '네! 이번 주말 번개모임 참여하실 건가요?' },
                    { sender: users[0], text: '당연하죠! 같이 가요~' },
                    { sender: users[1], text: '좋아요! 그럼 토요일 오전 10시에 봬요 😊' }
                ];

                for (const msg of messages) {
                    await fetch(`${BASE_URL}/chat/rooms/${chatData.room_id}/messages`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${msg.sender.token}`
                        },
                        body: JSON.stringify({
                            content: msg.text
                        })
                    });
                    console.log(`  - ${msg.sender.name}: ${msg.text}`);

                    // Small delay between messages
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            // Create chat with coach if available
            if (coaches.length > 0) {
                const coachChatRes = await fetch(`${BASE_URL}/chat/rooms`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${users[0].token}`
                    },
                    body: JSON.stringify({
                        participant_id: coaches[0].id
                    })
                });
                const coachChatData = await coachChatRes.json();

                if (coachChatData.room_id) {
                    console.log(`✅ Created chat room with coach ${coaches[0].name}`);

                    const coachMessages = [
                        { sender: users[0], text: '코치님, 레슨 문의드립니다.' },
                        { sender: coaches[0], text: '네! 어떤 부분이 궁금하신가요?' },
                        { sender: users[0], text: '초보자인데 주 2회 레슨 가능할까요?' },
                        { sender: coaches[0], text: '물론입니다! 화/목 저녁 7시는 어떠세요?' }
                    ];

                    for (const msg of coachMessages) {
                        await fetch(`${BASE_URL}/chat/rooms/${coachChatData.room_id}/messages`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${msg.sender.token}`
                            },
                            body: JSON.stringify({
                                content: msg.text
                            })
                        });
                        console.log(`  - ${msg.sender.name}: ${msg.text}`);
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            }
        }

        console.log('\n🎉 Comprehensive seed completed!');
        console.log(`\n📊 Summary:`);
        console.log(`   - Users created: ${users.length}`);
        console.log(`   - Coaches created: ${coaches.length}`);
        console.log(`   - Chat rooms: 2+`);
        console.log(`   - Activity history: Multiple club/flash joins`);

    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        throw err;
    }
}

// Run seed
seedComprehensiveData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
