const pool = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', '001_insert_meta_data.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Running migration...");
        await pool.query(sql);
        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
}

runMigration();
