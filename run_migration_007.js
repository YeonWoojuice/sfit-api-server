const fs = require('fs');
const path = require('path');
const pool = require('./src/config/database');

async function runMigration() {
    const client = await pool.connect();
    try {
        const sqlPath = path.join(__dirname, 'migrations', '007_add_flash_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration: 007_add_flash_columns.sql');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('Migration completed successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
