const pool = require('./src/config/database');

async function checkColumns() {
    try {
        const clubsRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clubs' AND column_name IN ('explane', 'explain', 'description');
    `);
        console.log('Clubs columns:', clubsRes.rows.map(r => r.column_name));

        const flashesRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'flash_meetups' AND column_name IN ('explane', 'explain', 'description');
    `);
        console.log('Flash Meetups columns:', flashesRes.rows.map(r => r.column_name));

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkColumns();
