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
        // console.log(JSON.stringify(data)); // Comment out body to avoid encoding issues
        throw new Error('Request failed');
    }
    return data;
}

async function run() {
    try {
        // 1. Create User (Candidate)
        const user = {
            username: `candidate_${Date.now()}`,
            password: 'password',
            name: 'Candidate Kim',
            phone: '010-1111-2222',
            email: `candidate_${Date.now()}@test.com`
        };
        const authRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        const authData = await authRes.json();
        const token = authData.accessToken;
        const userId = authData.user.id;

        console.log('Created candidate:', userId);

        // 2. Create Admin (or use existing, but let's create one and force role)
        const admin = {
            username: `admin_${Date.now()}`,
            password: 'password',
            name: 'Admin User',
            phone: '010-9999-0000',
            email: `admin_${Date.now()}@test.com`
        };
        const adminAuthRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(admin)
        });
        const adminAuthData = await adminAuthRes.json();
        const adminToken = adminAuthData.accessToken;
        const adminId = adminAuthData.user.id;

        // Force Admin Role
        await pool.query("UPDATE users SET role = 'ADMIN' WHERE id = $1", [adminId]);
        console.log('Created admin:', adminId);

        // 3. Insert Mock Certificate (Required for request)
        const certNum = `CERT-TEST-${Date.now()}`;
        await pool.query(`
            INSERT INTO coach_certifications (certificate_number, name, level, sport_id, issue_date)
            VALUES ($1, $2, '1급', 1, NOW())
        `, [certNum, 'Candidate Kim']);

        // 4. Request Coach Verification
        console.log('Requesting coach verification...');
        await request(`${BASE_URL}/coach/request`, 'POST', token, {
            name: 'Candidate Kim',
            certificateNumber: certNum
        });
        console.log('✅ Request submitted.');

        // 5. Admin: List Requests
        console.log('Admin listing requests...');
        const requests = await request(`${BASE_URL}/admin/coach-requests`, 'GET', adminToken);
        const myRequest = requests.find(r => r.user_id === userId);

        if (myRequest) {
            console.log('✅ Request found in admin list.');
        } else {
            throw new Error('Request NOT found in admin list');
        }

        // 6. Admin: Approve Request
        console.log('Admin approving request...');
        await request(`${BASE_URL}/admin/coach-requests/${myRequest.id}/approve`, 'POST', adminToken);
        console.log('✅ Request approved.');

        // 7. Verify User Role Updated
        const userCheck = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
        if (userCheck.rows[0].role === 'COACH') {
            console.log('✅ User role updated to COACH.');
        } else {
            console.error('❌ User role NOT updated.');
        }

        // 8. Verify in Coach List
        // Add profile first to make sure it appears (list query joins profiles)
        await pool.query(`
            INSERT INTO profiles (user_id, introduction, region_code, sports)
            VALUES ($1, 'New Coach', 'SEOUL', $2)
            ON CONFLICT (user_id) DO UPDATE 
            SET introduction = 'New Coach'
        `, [userId, [1]]);

        const coachList = await request(`${BASE_URL}/coach`, 'GET', token); // Public/User access
        if (coachList.coaches.some(c => c.id === userId)) {
            console.log('✅ User found in coach list.');
        } else {
            console.error('❌ User NOT found in coach list.');
        }

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        pool.end();
    }
}

run();
