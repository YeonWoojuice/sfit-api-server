const pool = require('./src/config/database');

async function checkSchema() {
    try {
        const tables = ['clubs', 'flash_meetups'];
        const result = {};
        for (const table of tables) {
            const res = await pool.query(`
                SELECT column_name, data_type
                FROM information_schema.columns 
                WHERE table_name = '${table}'
            `);
            result[table] = res.rows.map(r => r.column_name);
        }
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
