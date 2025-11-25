const fs = require('fs');
const API_URL = 'http://localhost:4000/api';

function log(msg) {
    console.log(msg);
    fs.appendFileSync('test_frontend_log.txt', msg + '\n');
}

async function testFrontendAuth() {
    fs.writeFileSync('test_frontend_log.txt', '');
    try {
        const uniqueId = Date.now();
        const frontendRegisterData = {
            ID: `fe_user_${uniqueId}`,
            Password: 'password123',
            Name: 'Frontend User',
            phonenumber: '010-9999-8888',
            Email: `fe_user_${uniqueId}`,
            EmailDomain: 'test.com'
        };

        log('1. Testing Register with Frontend Payload...');
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(frontendRegisterData)
        });
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(`Register failed: ${JSON.stringify(regData)}`);
        log('Register success: ' + JSON.stringify(regData));

        log('2. Testing Login with Frontend Payload...');
        const frontendLoginData = {
            loginID: frontendRegisterData.ID,
            loginPassword: frontendRegisterData.Password
        };
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(frontendLoginData)
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
        log('Login success, Token received: ' + (loginData.accessToken ? 'Yes' : 'No'));

    } catch (err) {
        log('Test failed: ' + err);
        console.error(err);
    }
}

testFrontendAuth();
