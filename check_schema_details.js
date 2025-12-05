const pool = require('./src/config/database');

async function run() {
    try {
        console.log('--- SPORTS ---');
        const sports = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sports'");
        sports.rows.forEach(row => console.log(JSON.stringify(row)));

        console.log('--- REVIEWS ---');
        const reviews = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reviews'");
        reviews.rows.forEach(row => console.log(JSON.stringify(row)));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
