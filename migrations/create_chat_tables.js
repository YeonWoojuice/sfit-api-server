const pool = require('../src/config/database');

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. chat_rooms
        await client.query(`
            CREATE TABLE IF NOT EXISTS chat_rooms (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                last_message TEXT,
                last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                unread_count_user INTEGER DEFAULT 0,
                unread_count_target INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, target_id)
            );
        `);
        console.log('Created chat_rooms table.');

        // 2. chat_messages
        await client.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
                sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                type VARCHAR(20) DEFAULT 'TEXT', -- 'TEXT', 'LONG_TEXT'
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('Created chat_messages table.');

        // 3. chat_favorites
        await client.query(`
            CREATE TABLE IF NOT EXISTS chat_favorites (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (user_id, room_id)
            );
        `);
        console.log('Created chat_favorites table.');

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
