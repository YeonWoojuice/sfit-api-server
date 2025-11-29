const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const authenticateToken = require('../middlewares/authenticateToken');

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF, WEBP)'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST /api/attachments
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "파일이 없습니다." });
        }

        const { filename, mimetype, size, path: filePath } = req.file;

        // Relative path for serving
        const relativePath = `/uploads/${filename}`;

        const result = await pool.query(
            `INSERT INTO attachments (file_path, file_name, mime_type, size) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [relativePath, filename, mimetype, size]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "파일 업로드 실패" });
    }
});

// GET /api/attachments/:id/file - 이미지 파일 제공
router.get('/:id/file', async (req, res) => {
    try {
        const { id } = req.params;

        // DB에서 파일 정보 조회
        const result = await pool.query(
            'SELECT file_path, file_name, mime_type FROM attachments WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "파일을 찾을 수 없습니다." });
        }

        const { file_path, file_name, mime_type } = result.rows[0];

        // file_path는 "/uploads/filename.jpg" 형식이므로 실제 경로로 변환
        const fileName = file_path.replace('/uploads/', '');
        const fullPath = path.join(uploadDir, fileName);

        // 파일 존재 여부 확인
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ message: "파일이 존재하지 않습니다." });
        }

        // 이미지 파일 전송
        res.setHeader('Content-Type', mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${file_name}"`);
        res.sendFile(fullPath);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "파일 조회 실패" });
    }
});

module.exports = router;
