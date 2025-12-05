const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret';

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// 1. GET /rooms - List Rooms
router.get('/rooms', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    // Support both 'filter' and 'filters' (frontend sends 'filters')
    const filter = req.query.filter || req.query.filters;
    const search = req.query.search;

    try {
        let query = `
            SELECT 
                r.id, r.last_message, r.last_message_at,
                r.unread_count_user, r.unread_count_target,
                r.user_id, r.target_id,
                CASE 
                    WHEN r.user_id = $1 THEN u_target.name 
                    ELSE u_user.name 
                END as partner_name,
                CASE 
                    WHEN r.user_id = $1 THEN u_target.id 
                    ELSE u_user.id 
                END as partner_id,
                CASE 
                    WHEN r.user_id = $1 THEN '/api/attachments/' || p_target.attachment_id || '/file'
                    ELSE '/api/attachments/' || p_user.attachment_id || '/file'
                END as partner_image,
                CASE 
                    WHEN f.room_id IS NOT NULL THEN true 
                    ELSE false 
                END as is_favorite
            FROM chat_rooms r
            JOIN users u_user ON r.user_id = u_user.id
            JOIN users u_target ON r.target_id = u_target.id
            LEFT JOIN profiles p_user ON u_user.id = p_user.user_id
            LEFT JOIN profiles p_target ON u_target.id = p_target.user_id
            LEFT JOIN chat_favorites f ON r.id = f.room_id AND f.user_id = $1
            WHERE r.user_id = $1 OR r.target_id = $1
        `;

        const params = [userId];
        let paramIdx = 2;

        if (filter === 'unread') {
            query += ` AND (
                (r.user_id = $1 AND r.unread_count_user > 0) OR 
                (r.target_id = $1 AND r.unread_count_target > 0)
            )`;
        } else if (filter === 'favorite') {
            query += ` AND f.room_id IS NOT NULL`;
        }

        if (search) {
            query += ` AND (
                (r.user_id = $1 AND u_target.name ILIKE $${paramIdx}) OR 
                (r.target_id = $1 AND u_user.name ILIKE $${paramIdx})
            )`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        query += ` ORDER BY r.last_message_at DESC NULLS LAST`;

        const { rows } = await pool.query(query, params);

        // Format response
        const rooms = rows.map(row => {
            const isUser = row.user_id === userId;
            const unreadCount = isUser ? row.unread_count_user : row.unread_count_target;
            return {
                id: row.id,
                partner: {
                    id: row.partner_id,
                    name: row.partner_name,
                    image_url: row.partner_image
                },
                last_message: row.last_message,
                last_message_at: row.last_message_at,
                unread_count: unreadCount,
                is_favorite: row.is_favorite
            };
        });

        res.json({ count: rooms.length, rooms });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 2. POST /rooms - Create or Get Room
router.post('/rooms', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { targetId } = req.body;

    if (!targetId) return res.status(400).json({ message: 'Target ID required' });

    try {
        // Check existing room (canonical order: user_id < target_id usually, but here we check both ways or enforce order)
        // My schema has UNIQUE(user_id, target_id), so I need to check both (A,B) and (B,A) OR enforce sorting.
        // Let's enforce sorting to avoid duplicates.
        // Actually, let's just check if a room exists where (user=A AND target=B) OR (user=B AND target=A).

        const existing = await pool.query(`
            SELECT id FROM chat_rooms 
            WHERE (user_id = $1 AND target_id = $2) OR (user_id = $2 AND target_id = $1)
        `, [userId, targetId]);

        if (existing.rows.length > 0) {
            return res.json({ room_id: existing.rows[0].id, created: false });
        }

        // Create new room
        // To maintain consistency, maybe sort IDs? Or just insert as is.
        // Let's insert as (userId, targetId) but we need to handle the unique constraint if we want to prevent (B,A) when (A,B) exists.
        // Better to check existence first (done above).

        const newRoom = await pool.query(`
            INSERT INTO chat_rooms (user_id, target_id)
            VALUES ($1, $2)
            RETURNING id
        `, [userId, targetId]);

        res.status(201).json({ room_id: newRoom.rows[0].id, created: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 3. GET /rooms/:id/messages - Get History
router.get('/rooms/:id/messages', authenticateToken, async (req, res) => {
    const roomId = req.params.id;
    const { limit = 50, offset = 0 } = req.query;

    try {
        const query = `
            SELECT 
                m.id, m.sender_id, m.content, m.type, m.created_at, m.is_read,
                u.name as sender_name,
                CASE 
                    WHEN p.attachment_id IS NOT NULL THEN '/api/attachments/' || p.attachment_id || '/file'
                    ELSE NULL 
                END as sender_image
            FROM chat_messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE m.room_id = $1
            ORDER BY m.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const { rows } = await pool.query(query, [roomId, limit, offset]);

        res.json({ messages: rows.reverse() }); // Return oldest first for UI usually, or keep DESC for infinite scroll
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 4. POST /rooms/:id/messages - Send Message
router.post('/rooms/:id/messages', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const roomId = req.params.id;
    const { content, type = 'TEXT' } = req.body;

    if (!content) return res.status(400).json({ message: 'Content required' });

    try {
        // 1. Insert Message
        const msgRes = await pool.query(`
            INSERT INTO chat_messages (room_id, sender_id, content, type)
            VALUES ($1, $2, $3, $4)
            RETURNING id, created_at
        `, [roomId, userId, content, type]);

        const message = msgRes.rows[0];

        // 2. Update Room (last_message, unread_count)
        // Need to know who is the 'other' user to increment their unread count.
        const roomRes = await pool.query('SELECT user_id, target_id FROM chat_rooms WHERE id = $1', [roomId]);
        if (roomRes.rows.length === 0) return res.status(404).json({ message: 'Room not found' });

        const room = roomRes.rows[0];
        const isUserOwner = room.user_id === userId;

        // If sender is user_id, increment unread_count_target.
        // If sender is target_id, increment unread_count_user.

        let updateQuery = `
            UPDATE chat_rooms 
            SET last_message = $1, last_message_at = $2, 
                updated_at = NOW()
        `;

        if (isUserOwner) {
            updateQuery += `, unread_count_target = unread_count_target + 1`;
        } else {
            updateQuery += `, unread_count_user = unread_count_user + 1`;
        }

        updateQuery += ` WHERE id = $3`;

        await pool.query(updateQuery, [content, message.created_at, roomId]);

        res.status(201).json({ message: 'Sent', data: message });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 5. POST /rooms/:id/read - Mark Read
router.post('/rooms/:id/read', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const roomId = req.params.id;

    try {
        // Determine which count to reset
        const roomRes = await pool.query('SELECT user_id, target_id FROM chat_rooms WHERE id = $1', [roomId]);
        if (roomRes.rows.length === 0) return res.status(404).json({ message: 'Room not found' });

        const room = roomRes.rows[0];

        let updateQuery = `UPDATE chat_rooms SET `;
        if (room.user_id === userId) {
            updateQuery += `unread_count_user = 0`;
        } else if (room.target_id === userId) {
            updateQuery += `unread_count_target = 0`;
        } else {
            return res.status(403).json({ message: 'Not a member' });
        }
        updateQuery += ` WHERE id = $1`;

        await pool.query(updateQuery, [roomId]);

        // Also mark messages as read (optional, but good for data consistency)
        await pool.query(`
            UPDATE chat_messages 
            SET is_read = TRUE 
            WHERE room_id = $1 AND sender_id != $2 AND is_read = FALSE
        `, [roomId, userId]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 6. POST /rooms/:id/favorite - Toggle Favorite
router.post('/rooms/:id/favorite', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const roomId = req.params.id;

    try {
        const check = await pool.query(
            'SELECT * FROM chat_favorites WHERE user_id = $1 AND room_id = $2',
            [userId, roomId]
        );

        if (check.rows.length > 0) {
            // Remove
            await pool.query(
                'DELETE FROM chat_favorites WHERE user_id = $1 AND room_id = $2',
                [userId, roomId]
            );
            res.json({ is_favorite: false });
        } else {
            // Add
            await pool.query(
                'INSERT INTO chat_favorites (user_id, room_id) VALUES ($1, $2)',
                [userId, roomId]
            );
            res.json({ is_favorite: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// 7. PUT /rooms/:roomId/messages/:messageId - Edit Message
router.put('/rooms/:roomId/messages/:messageId', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { roomId, messageId } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ message: 'Content required' });

    try {
        // Check ownership and room
        const msgRes = await pool.query(
            'SELECT * FROM chat_messages WHERE id = $1 AND room_id = $2',
            [messageId, roomId]
        );

        if (msgRes.rows.length === 0) {
            return res.status(404).json({ message: 'Message not found' });
        }

        const message = msgRes.rows[0];
        if (message.sender_id !== userId) {
            return res.status(403).json({ message: 'Not authorized to edit this message' });
        }

        // Update
        const updateRes = await pool.query(
            'UPDATE chat_messages SET content = $1 WHERE id = $2 RETURNING *',
            [content, messageId]
        );

        // Update room's last message if this was the last message
        // This is tricky because if the last message was edited, we should update the room's preview.
        // Let's check if this message's created_at matches the room's last_message_at.
        // Or simpler: just check if it's the latest message in the room.

        const roomRes = await pool.query('SELECT last_message_at FROM chat_rooms WHERE id = $1', [roomId]);
        if (roomRes.rows.length > 0) {
            const room = roomRes.rows[0];
            // Compare timestamps (careful with precision) or just check if this message is the latest one.
            // Let's fetch the latest message from DB to be sure.
            const latestMsgRes = await pool.query(
                'SELECT content, created_at FROM chat_messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 1',
                [roomId]
            );

            if (latestMsgRes.rows.length > 0 && latestMsgRes.rows[0].created_at.getTime() === message.created_at.getTime()) {
                await pool.query(
                    'UPDATE chat_rooms SET last_message = $1 WHERE id = $2',
                    [content, roomId]
                );
            }
        }

        res.json({ message: 'Updated', data: updateRes.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
