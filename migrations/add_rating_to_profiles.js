const pool = require('../src/config/database');

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 0.0;
        `);

        console.log('Added rating column to profiles table.');
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
