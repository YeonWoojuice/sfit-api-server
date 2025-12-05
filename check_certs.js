const pool = require('./src/config/database');

async function run() {
    try {
        const res = await pool.query("SELECT * FROM coach_certifications");
        const fs = require('fs');
        fs.writeFileSync('certs_output_node.txt', JSON.stringify(res.rows, null, 2), 'utf8');
        console.log('Written to certs_output_node.txt');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
