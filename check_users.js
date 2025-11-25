const pool = require('./src/config/database');

async function checkUsers() {
    try {
        const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
    `);
        console.log("Users columns:", res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkUsers();
