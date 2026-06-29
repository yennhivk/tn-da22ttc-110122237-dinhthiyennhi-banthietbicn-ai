const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình multer upload ảnh bài viết
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/articles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'article-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Chỉ cho phép upload file ảnh (jpg, png, gif, webp)'));
    }
});

// ==========================================
// PUBLIC API - Lấy bài viết cho frontend
// ==========================================

// Lấy tất cả bài viết (public)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 12, category, search } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = "trang_thai = 'xuat_ban'";
        const params = [];

        if (category) {
            whereClause += ` AND danh_muc = ?`;
            params.push(category);
        }
        
        if (search) {
            whereClause += ` AND (tieu_de LIKE ? OR mo_ta_ngan LIKE ? OR tags LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [articles] = await db.query(`
            SELECT ma_bai_viet, tieu_de, mo_ta_ngan, hinh_anh, danh_muc, tac_gia, tags, luot_xem, ngay_tao
            FROM bai_viet
            WHERE ${whereClause}
            ORDER BY ngay_tao DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM bai_viet WHERE ${whereClause}`, params);

        res.json({
            success: true,
            data: articles,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Get articles error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Lấy bài viết theo danh mục
router.get('/category/:category', async (req, res) => {
    try {
        const { limit = 6 } = req.query;
        const [articles] = await db.query(`
            SELECT ma_bai_viet, tieu_de, mo_ta_ngan, hinh_anh, danh_muc, tac_gia, ngay_tao
            FROM bai_viet
            WHERE trang_thai = 'xuat_ban' AND danh_muc = ?
            ORDER BY ngay_tao DESC
            LIMIT ?
        `, [req.params.category, parseInt(limit)]);

        res.json({ success: true, data: articles });
    } catch (error) {
        console.error('Get articles by category error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Lấy bài viết mới nhất
router.get('/latest', async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        const [articles] = await db.query(`
            SELECT ma_bai_viet, tieu_de, mo_ta_ngan, hinh_anh, danh_muc, tac_gia, ngay_tao
            FROM bai_viet
            WHERE trang_thai = 'xuat_ban'
            ORDER BY ngay_tao DESC
            LIMIT ?
        `, [parseInt(limit)]);

        res.json({ success: true, data: articles });
    } catch (error) {
        console.error('Get latest articles error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ==========================================
// ADMIN API - Quản lý bài viết (ĐẶT TRƯỚC route /:id)
// ==========================================

// Upload hình ảnh bài viết
router.post('/upload-image', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Không có file được upload' });
        }

        const imagePath = '/uploads/articles/' + req.file.filename;
        
        res.json({
            success: true,
            message: 'Upload hình ảnh thành công',
            data: { url: imagePath }
        });
    } catch (error) {
        console.error('Upload article image error:', error);
        res.status(500).json({ success: false, message: 'Lỗi upload hình ảnh' });
    }
});

// Lấy tất cả bài viết (admin)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, category, status, search } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        const params = [];

        if (category) {
            whereClause += ` AND danh_muc = ?`;
            params.push(category);
        }
        if (status) {
            whereClause += ` AND trang_thai = ?`;
            params.push(status);
        }
        if (search) {
            whereClause += ` AND (tieu_de LIKE ? OR mo_ta_ngan LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        const [articles] = await db.query(`
            SELECT * FROM bai_viet
            WHERE ${whereClause}
            ORDER BY ngay_tao DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM bai_viet WHERE ${whereClause}`, params);

        res.json({
            success: true,
            data: articles,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total
            }
        });
    } catch (error) {
        console.error('Admin get articles error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Lấy chi tiết bài viết (ĐẶT SAU các route cụ thể)
router.get('/:id', async (req, res) => {
    try {
        // Tăng lượt xem
        await db.query(`UPDATE bai_viet SET luot_xem = luot_xem + 1 WHERE ma_bai_viet = ?`, [req.params.id]);

        const [articles] = await db.query(`
            SELECT * FROM bai_viet WHERE ma_bai_viet = ?
        `, [req.params.id]);

        if (articles.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
        }

        // Lấy bài viết liên quan
        const [related] = await db.query(`
            SELECT ma_bai_viet, tieu_de, hinh_anh, danh_muc, ngay_tao
            FROM bai_viet
            WHERE trang_thai = 'xuat_ban' AND ma_bai_viet != ? AND danh_muc = ?
            ORDER BY ngay_tao DESC
            LIMIT 4
        `, [req.params.id, articles[0].danh_muc]);

        res.json({ success: true, data: { ...articles[0], related } });
    } catch (error) {
        console.error('Get article detail error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Thêm bài viết mới
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tac_gia, tags, trang_thai } = req.body;

        if (!tieu_de) {
            return res.status(400).json({ success: false, message: 'Tiêu đề là bắt buộc' });
        }

        const [result] = await db.query(`
            INSERT INTO bai_viet (tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tac_gia, tags, trang_thai, ma_tai_khoan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc || 'huong_dan', tac_gia || 'Admin', tags, trang_thai || 'xuat_ban', req.user.ma_tai_khoan]);

        res.status(201).json({
            success: true,
            message: 'Thêm bài viết thành công',
            data: { ma_bai_viet: result.insertId }
        });
    } catch (error) {
        console.error('Create article error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Cập nhật bài viết
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tac_gia, tags, trang_thai } = req.body;

        await db.query(`
            UPDATE bai_viet SET
                tieu_de = COALESCE(?, tieu_de),
                mo_ta_ngan = COALESCE(?, mo_ta_ngan),
                noi_dung = COALESCE(?, noi_dung),
                hinh_anh = COALESCE(?, hinh_anh),
                danh_muc = COALESCE(?, danh_muc),
                tac_gia = COALESCE(?, tac_gia),
                tags = COALESCE(?, tags),
                trang_thai = COALESCE(?, trang_thai),
                ngay_cap_nhat = NOW()
            WHERE ma_bai_viet = ?
        `, [tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tac_gia, tags, trang_thai, req.params.id]);

        res.json({ success: true, message: 'Cập nhật bài viết thành công' });
    } catch (error) {
        console.error('Update article error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Xóa bài viết
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query(`DELETE FROM bai_viet WHERE ma_bai_viet = ?`, [req.params.id]);
        res.json({ success: true, message: 'Xóa bài viết thành công' });
    } catch (error) {
        console.error('Delete article error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

module.exports = router;
