const http = require('http');

function postRequest(data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 4000,
            path: '/api/clubs',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': 'Bearer ...' // Need token if auth is enabled
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log("Starting Tests...");

    // Test 1: Valid Club Creation
    try {
        const validData = {
            name: "Test Club",
            explane: "This is a test club",
            region_code: "SEOUL_GANGNAM", // Assuming this code exists or is accepted
            sport_id: 1, // Assuming this ID exists
            start_time: "10:00",
            end_time: "12:00",
            days_of_week: [0, 6],
            capacity_min: 5,
            capacity_max: 20,
            level_min: "초보",
            level_max: "상급",
            is_public: true
        };
        // Note: This might fail with 401/403 if auth is required and we don't send token.
        // Or 500 if DB connection fails.
        const res1 = await postRequest(validData);
        console.log(`Test 1 (Valid): Status ${res1.status}`);
        console.log("Response:", JSON.stringify(res1.body, null, 2));

        if (res1.status === 201) {
            console.log("  PASS: Created successfully");
        } else {
            console.log("  FAIL: Expected 201");
        }
    } catch (e) {
        console.log("Test 1 Error:", e.message);
    }

    // Test 2: Invalid Time
    try {
        const invalidData = {
            name: "Invalid Club",
            explane: "Time is wrong",
            region_code: "SEOUL_GANGNAM",
            sport_id: 1,
            start_time: "13:00",
            end_time: "12:00"
        };
        const res2 = await postRequest(invalidData);
        console.log(`Test 2 (Invalid Time): Status ${res2.status}`);
        if (res2.status === 400) {
            console.log("  PASS: Correctly rejected");
        } else {
            console.log("  FAIL: Should be 400");
        }
    } catch (e) {
        console.log("Test 2 Error:", e.message);
    }
}

runTests();
