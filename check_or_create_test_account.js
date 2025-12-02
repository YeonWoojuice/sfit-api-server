const pool = require('./src/config/database');
const bcrypt = require('bcrypt');

async function checkOrCreateTestAccount() {
    const client = await pool.connect();
    try {
        const username = 'testuser1';
        const password = 'password123';
        const email = 'testuser1@example.com';
        const name = 'Test User';
        const phone = '010-1234-5678';
        const region_code = 'SEOUL';

        // Check if user exists
        const checkQuery = 'SELECT * FROM users WHERE username = $1';
        const checkResult = await client.query(checkQuery, [username]);

        if (checkResult.rows.length > 0) {
            console.log(`Test account '${username}' already exists.`);
            console.log('User details:', checkResult.rows[0]);
        } else {
            console.log(`Test account '${username}' does not exist. Creating...`);

            const hashedPassword = await bcrypt.hash(password, 10);

            const insertQuery = `
        INSERT INTO users (username, password, email, name, phone, role)
        VALUES ($1, $2, $3, $4, $5, 'USER')
        RETURNING *
      `;
            const insertResult = await client.query(insertQuery, [username, hashedPassword, email, name, phone]);
            const newUser = insertResult.rows[0];

            // Create profile
            await client.query(
                `INSERT INTO profiles (user_id, region_code, level) VALUES ($1, $2, 1)`,
                [newUser.id, region_code]
            );

            console.log(`Test account '${username}' created successfully.`);
            console.log('User details:', newUser);
        }

    } catch (err) {
        console.error('Error checking/creating test account:', err);
    } finally {
        client.release();
        pool.end(); // Close the pool to exit the script
    }
}

checkOrCreateTestAccount();
