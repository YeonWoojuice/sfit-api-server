const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'sfit',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function fixTypo() {
    try {
        console.log('Renaming column explane to explain in clubs table...');
        await pool.query('ALTER TABLE clubs RENAME COLUMN explane TO explain;');
        console.log('Success!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

fixTypo();
