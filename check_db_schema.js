const pool = require('./src/config/database');

async function checkSchema() {
    try {
        const tables = ['clubs', 'flash_meetups'];
        for (const table of tables) {
            console.log(`\n--- Columns in ${table} ---`);
            const res = await pool.query(`
                SELECT column_name, data_type, column_default, is_nullable
                FROM information_schema.columns 
                WHERE table_name = '${table}'
                ORDER BY column_name;
            `);
            res.rows.forEach(row => {
                console.log(`${row.column_name} (${row.data_type}) - Default: ${row.column_default}, Nullable: ${row.is_nullable}`);
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
