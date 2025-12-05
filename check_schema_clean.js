const pool = require('./src/config/database');
const fs = require('fs');

async function run() {
    try {
        const sports = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sports'");
        const reviews = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reviews'");

        const output = {
            sports: sports.rows,
            reviews: reviews.rows
        };

        fs.writeFileSync('schema_clean.json', JSON.stringify(output, null, 2), 'utf8');
        console.log('Written to schema_clean.json');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
