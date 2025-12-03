const pool = require('./src/config/database');

async function checkRatingSchema() {
    try {
        const tables = ['clubs', 'flash_meetups'];
        for (const table of tables) {
            const res = await pool.query(`
                SELECT column_name, column_default, is_nullable, data_type
                FROM information_schema.columns 
                WHERE table_name = '${table}' AND column_name = 'rating_avg';
            `);
            console.log(`\nTable: ${table}`);
            if (res.rows.length > 0) {
                console.log(res.rows[0]);
            } else {
                console.log('rating_avg column not found');
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkRatingSchema();
