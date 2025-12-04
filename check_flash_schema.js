const pool = require('./src/config/database');

async function checkFlashSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'flash_meetups' AND column_name = 'attachment_id';
        `);
        console.log('Attachment ID:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkFlashSchema();
