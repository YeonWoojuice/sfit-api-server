const pool = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', '005_update_regions.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Running migration 005...");
        await pool.query(sql);
        console.log("Migration 005 completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
}

runMigration();
