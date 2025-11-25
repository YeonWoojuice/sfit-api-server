const pool = require('./src/config/database');

async function checkTables() {
    try {
        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log("Existing tables:", res.rows.map(r => r.table_name));

        // Also check columns for 'clubs' table to see if it matches the new requirement
        const clubsColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'clubs'
    `);
        console.log("Clubs columns:", clubsColumns.rows);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkTables();
