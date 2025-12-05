const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkFlashTable() {
    try {
        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'flash_meetups'
    `);
        if (res.rows.length > 0) {
            console.log('✅ Table flash_meetups exists.');
        } else {
            console.log('❌ Table flash_meetups does NOT exist.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkFlashTable();
