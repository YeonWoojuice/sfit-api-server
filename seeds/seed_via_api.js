// Seed data via API endpoints
async function seedViaAPI() {
    const BASE_URL = 'http://localhost:4000/api';

    try {
        console.log('🌱 Starting seed via API...');

        // 1. Register host users
        const host1Res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `host_${Date.now()}`,
                password: 'password123',
                name: '김호스트',
                phone: '010-1111-1111',
                email: `host1_${Date.now()}@test.com`
            })
        });
        const host1Data = await host1Res.json();
        const host1Token = host1Data.accessToken;
        console.log('✅ Host 1 created');

        const host2Res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `host2_${Date.now()}`,
                password: 'password123',
                name: '이리더',
                phone: '010-2222-2222',
                email: `host2_${Date.now()}@test.com`
            })
        });
        const host2Data = await host2Res.json();
        const host2Token = host2Data.accessToken;
        console.log('✅ Host 2 created');

        // 2. Create clubs
        const clubs = [
            {
                name: '서울 테니스 클럽',
                explain: '매주 주말 테니스를 즐기는 모임입니다',
                region_code: 'SEOUL',
                location: '올림픽공원 테니스장',
                sport_id: 1,
                level_limit: [1, 2, 3]
            },
            {
                name: '부산 야구 동호회',
                explain: '야구를 사랑하는 사람들의 모임',
                region_code: 'BUSAN',
                location: '사직야구장',
                sport_id: 2,
                level_limit: [2, 3, 4]
            },
            {
                name: '경기 축구 클럽',
                explain: '주말 축구 경기를 함께 즐깁니다',
                region_code: 'GYEONGGI',
                location: '수원종합운동장',
                sport_id: 3,
                level_limit: [1, 2, 3, 4, 5]
            }
        ];

        for (let i = 0; i < clubs.length; i++) {
            const token = i === 0 ? host1Token : (i === 1 ? host2Token : host1Token);
            const res = await fetch(`${BASE_URL}/clubs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(clubs[i])
            });
            const data = await res.json();
            console.log(`✅ Created club: ${clubs[i].name}`);
        }

        // 3. Create flash meetups
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);

        const flashes = [
            {
                name: '한강 러닝 번개',
                explain: '가볍게 뛰실 분들 모여요!',
                region_code: 'SEOUL',
                location: '여의도 한강공원',
                sport_id: 5,
                level_limit: [1, 2, 3],
                meetup_date: tomorrow.toISOString().split('T')[0],
                start_time: '10:00',
                end_time: '12:00',
                max_participants: 10
            },
            {
                name: '탁구 번개 모임',
                explain: '탁구 치실 분 구합니다',
                region_code: 'SEOUL',
                location: '강남구민회관',
                sport_id: 4,
                level_limit: [2, 3, 4],
                meetup_date: nextWeek.toISOString().split('T')[0],
                start_time: '14:00',
                end_time: '16:00',
                max_participants: 8
            },
            {
                name: '배드민턴 친선전',
                explain: '배드민턴 함께 쳐요',
                region_code: 'GYEONGGI',
                location: '분당 체육관',
                sport_id: 6,
                level_limit: [1, 2, 3, 4, 5],
                meetup_date: nextMonth.toISOString().split('T')[0],
                start_time: '18:00',
                end_time: '20:00',
                max_participants: 12
            }
        ];

        for (let i = 0; i < flashes.length; i++) {
            const token = i === 0 ? host1Token : (i === 1 ? host2Token : host1Token);
            const res = await fetch(`${BASE_URL}/flashes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(flashes[i])
            });
            const data = await res.json();
            console.log(`✅ Created flash: ${flashes[i].name}`);
        }

        console.log('🎉 Seed completed successfully!');

    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        throw err;
    }
}

// Run seed
seedViaAPI()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
