const pool = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', '006_remove_sub_regions.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Running migration 006...");
        await pool.query(sql);
        console.log("Migration 006 completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
}

runMigration();
