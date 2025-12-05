const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function deleteAll() {
    try {
        console.log('Deleting ALL club data...');

        // Delete in order of dependencies
        // 1. Applications (if any)
        const appsRes = await pool.query("DELETE FROM club_applications");
        console.log(`Deleted ${appsRes.rowCount} club applications.`);

        // 2. Members
        const membersRes = await pool.query("DELETE FROM club_members");
        console.log(`Deleted ${membersRes.rowCount} club members.`);

        // 3. Clubs
        const clubsRes = await pool.query("DELETE FROM clubs");
        console.log(`Deleted ${clubsRes.rowCount} clubs.`);

        console.log('✅ All club data deleted successfully.');

    } catch (err) {
        console.error('Deletion failed:', err);
    } finally {
        await pool.end();
    }
}

deleteAll();
