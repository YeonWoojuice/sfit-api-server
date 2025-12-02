const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Running migration 008...');
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '008_update_flash_level.sql'), 'utf8');
        await client.query(sql);
        console.log('Migration 008 completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
