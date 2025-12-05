const pool = require('./src/config/database');

async function run() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
        res.rows.forEach(row => console.log(JSON.stringify(row)));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
