const pool = require('./src/config/database');

async function check() {
    try {
        const sports = await pool.query('SELECT * FROM sports');
        console.log('Sports:', sports.rows);

        const regions = await pool.query('SELECT * FROM regions WHERE code LIKE \'SEOUL%\' LIMIT 5');
        console.log('Regions (Seoul):', regions.rows);
    } catch (err) {
        console.error(err);
    } finally {
        // pool.end() might not be exposed, but script will exit
        process.exit(0);
    }
}

check();
