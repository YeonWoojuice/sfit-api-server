const pool = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', '004_change_club_level_type.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Running migration 004...");
        await pool.query(sql);
        console.log("Migration 004 completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
}

runMigration();
