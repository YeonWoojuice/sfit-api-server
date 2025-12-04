const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTokens() {
    const username = process.argv[2];
    if (!username) {
        console.log('Usage: node check_tokens.js <username>');
        process.exit(1);
    }

    try {
        const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userRes.rows.length === 0) {
            console.log('User not found');
            return;
        }
        const userId = userRes.rows[0].id;

        const res = await pool.query('SELECT id, revoked_at, created_at FROM auth_tokens WHERE user_id = $1 ORDER BY created_at', [userId]);
        console.log(`Tokens for ${username} (${userId}):`);
        res.rows.forEach(row => {
            const revoked = row.revoked_at ? 'YES' : 'NO';
            console.log(`ID: ${row.id.substring(0, 8)}, Revoked: ${revoked}, Created: ${row.created_at.toISOString()}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkTokens();
