const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listClubs() {
    try {
        const res = await pool.query("SELECT id, name, sport_id FROM clubs");
        console.log('Current Clubs:');
        res.rows.forEach(r => console.log(`${r.id}: ${r.name} (Sport ID: ${r.sport_id})`));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listClubs();
