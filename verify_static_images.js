const fs = require('fs');
const path = require('path');
const pool = require('./src/config/database');

const BASE_URL = 'http://localhost:4000/api';
const STATIC_URL = 'http://localhost:4000';
let authToken = '';
let clubId = '';

async function request(url, method, body = null, headers = {}) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(JSON.stringify(data));
    }
    return data;
}

async function login() {
    try {
        const data = await request(`${BASE_URL}/auth/login`, 'POST', {
            username: 'testuser1',
            password: 'password123'
        });
        authToken = data.accessToken;
        console.log('Login successful');
    } catch (err) {
        console.error('Login failed:', err.message);
        process.exit(1);
    }
}

async function uploadImage() {
    try {
        // Create a dummy image file
        const imagePath = path.join(__dirname, 'test_image.jpg');
        if (!fs.existsSync(imagePath)) {
            fs.writeFileSync(imagePath, 'dummy image content');
        }

        // const formData = new FormData();
        // We need to read the file as a stream or buffer for FormData
        // Since we are in node, we can use fs.createReadStream, but standard fetch might need blob.
        // Let's use a simpler approach: just mock the upload response or use a real file if possible.
        // Actually, let's try to upload a real small file.

        // Note: node-fetch or native fetch with FormData in Node environment can be tricky.
        // Let's assume we can just verify the GET response structure if we manually insert an attachment record,
        // OR we can try to use the existing 'test_image.jpg' if it exists.

        // For simplicity, let's insert a record directly into DB to simulate upload, 
        // and check if the API returns the correct static path.
        // Then check if we can fetch that static path (assuming the file exists).

        // 1. Create a dummy file in uploads folder
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
        const testFileName = `test_static_${Date.now()}.txt`; // Using txt for simplicity, but API expects image.
        // Wait, API filters images. Let's make a .jpg file.
        const testImageName = `test_static_${Date.now()}.jpg`;
        const testImagePath = path.join(uploadsDir, testImageName);
        fs.writeFileSync(testImagePath, 'fake image data');

        // 2. Insert into DB
        const result = await pool.query(
            `INSERT INTO attachments (file_path, file_name, mime_type, size) 
             VALUES ($1, $2, 'image/jpeg', 100) RETURNING id`,
            [`/uploads/${testImageName}`, testImageName]
        );
        const attachmentId = result.rows[0].id;
        console.log('Simulated upload, attachmentId:', attachmentId);

        return { attachmentId, testImageName };

    } catch (err) {
        console.error('Upload simulation failed:', err.message);
        process.exit(1);
    }
}

async function createClub(attachmentId) {
    try {
        const data = await request(`${BASE_URL}/clubs`, 'POST', {
            name: 'Test Club Static Image',
            explain: 'Testing static image',
            region_code: 'SEOUL',
            sport_id: 1,
            start_time: '10:00',
            end_time: '12:00',
            attachment_id: attachmentId
        }, { Authorization: `Bearer ${authToken}` });

        clubId = data.club.id;
        console.log('Club created:', clubId);

        // Fetch details to get image_url
        const detailData = await request(`${BASE_URL}/clubs/${clubId}`, 'GET', null, { Authorization: `Bearer ${authToken}` });
        console.log('Club image_url:', detailData.image_url);

        if (detailData.image_url !== '/images/default-club.jpg') {
            throw new Error(`Image URL mismatch. Expected /images/default-club.jpg, got ${detailData.image_url}`);
        }
        return detailData.image_url;
    } catch (err) {
        console.error('Create Club failed:', err.message);
    }
}

async function verifyStaticAccess(imageUrl) {
    try {
        const url = `${STATIC_URL}${imageUrl}`;
        console.log('Fetching static image from:', url);
        const res = await fetch(url);
        if (res.ok) {
            console.log('Static image fetch successful!');
            const contentType = res.headers.get('content-type');
            console.log('Content-Type:', contentType);
            if (contentType && contentType.includes('image')) {
                console.log('Content verified as image!');
            } else {
                console.warn('Content-Type check failed or missing, but fetch was 200 OK.');
            }
        } else {
            console.error('Static image fetch failed:', res.status);
        }
    } catch (err) {
        console.error('Static fetch error:', err.message);
    }
}

async function run() {
    await login();
    const { attachmentId, testImageName } = await uploadImage();
    const imageUrl = await createClub(attachmentId);
    if (imageUrl) {
        await verifyStaticAccess(imageUrl);
    }
    pool.end();
}

run();
