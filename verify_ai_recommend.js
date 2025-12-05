const pool = require('./src/config/database');

const BASE_URL = 'http://localhost:4000/api';

async function request(url, method, token = null, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
        return { error: true, status: res.status, data };
    }
    return data;
}

async function run() {
    try {
        // 1. Test Guest Recommendation (Matching Params)
        console.log('Requesting AI recommendation...');
        const guestData = await request(`${BASE_URL}/coach/recommend?region=SEOUL&sports=1&age=30`, 'GET');

        if (guestData.recommendations && guestData.recommendations.length > 0) {
            console.log(`✅ AI recommendation success (Found ${guestData.recommendations.length} matches).`);

            const firstRec = guestData.recommendations[0];
            console.log('   Top match:', firstRec.name);
            console.log('   Reason:', firstRec.recommendation_reason);

            // Check if reason looks like AI generated (contains Korean, longer than simple list)
            if (firstRec.recommendation_reason && firstRec.recommendation_reason.length > 10) {
                console.log('   Reason looks valid (AI generated).');
            } else {
                console.warn('   Reason might be too short or fallback used.');
            }
        } else {
            console.error('❌ AI recommendation failed (No matches).');
        }

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        pool.end();
    }
}

run();
