const pool = require('./src/config/database');

async function run() {
    try {
        const res = await pool.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'profiles'");
        const fs = require('fs');
        const output = res.rows.map(row => JSON.stringify(row)).join('\n');
        fs.writeFileSync('schema_output_node.txt', output, 'utf8');
        console.log('Written to schema_output_node.txt');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
