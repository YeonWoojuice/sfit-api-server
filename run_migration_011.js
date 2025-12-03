const pool = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Running migration 011...');
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '011_unify_explain_column.sql'), 'utf8');
        await client.query(sql);
        console.log('Migration 011 completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
