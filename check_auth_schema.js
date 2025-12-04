const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        const res = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'auth_tokens'
    `);
        const columns = res.rows.map(r => r.column_name);
        console.log('Columns:', columns.join(', '));
        if (columns.includes('revoked_at')) {
            console.log('✅ revoked_at exists');
        } else {
            console.log('❌ revoked_at MISSING');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
