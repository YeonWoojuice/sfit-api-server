const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        await pool.query(`
            ALTER TABLE coach_requests 
            ADD COLUMN IF NOT EXISTS introduction TEXT,
            ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES attachments(id);
        `);
        console.log('✅ Migration completed: Added introduction and attachment_id to coach_requests');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        pool.end();
    }
}

migrate();
