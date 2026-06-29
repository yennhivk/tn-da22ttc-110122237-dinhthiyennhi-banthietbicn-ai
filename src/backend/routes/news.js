const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// ==========================================
// PUBLIC API - Lấy tin tức cho frontend
// ==========================================

// Lấy tất cả tin tức (public)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 12, category, search, featured, time } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = "trang_thai = 'hien_thi'";
        const params = [];

        // Lọc theo danh mục (hỗ trợ nhiều danh mục)
        if (category) {
            const categories = Array.isArray(category) ? category : category.split(',');
            const placeholders = categories.map(() => '?').join(', ');
            whereClause += ` AND danh_muc IN (${placeholders})`;
            params.push(...categories);
        }
        
        // Lọc theo tìm kiếm
        if (search) {
            whereClause += ` AND (tieu_de LIKE ? OR mo_ta_ngan LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Lọc theo thời gian
        if (time && time !== 'all') {
            if (time === 'today') {
                whereClause += ` AND DATE(ngay_tao) = CURDATE()`;
            } else if (time === 'week') {
                whereClause += ` AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
            } else if (time === 'month') {
                whereClause += ` AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
            }
        }

        if (featured === 'true') {
            whereClause += ` AND noi_bat = 1`;
        }

        console.log('📰 News Filter - Where:', whereClause);
        console.log('📰 News Filter - Params:', params);

        const [news] = await db.query(`
            SELECT ma_tin_tuc, tieu_de, mo_ta_ngan, hinh_anh, danh_muc, tag, mau_tag, luot_xem, noi_bat, ngay_tao
            FROM tin_tuc
            WHERE ${whereClause}
            ORDER BY noi_bat DESC, ngay_tao DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM tin_tuc WHERE ${whereClause}`, params);

        res.json({
            success: true,
            data: news,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Get news error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Lấy tin tức nổi bật
router.get('/featured', async (req, res) => {
    try {
        const [featured] = await db.query(`
            SELECT ma_tin_tuc, tieu_de, mo_ta_ngan, hinh_anh, danh_muc, tag, mau_tag, ngay_tao
            FROM tin_tuc
            WHERE trang_thai = 'hien_thi' AND noi_bat = 1
            ORDER BY ngay_tao DESC
            LIMIT 4
        `);

        res.json({ success: true, data: featured });
    } catch (error) {
        console.error('Get featured news error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Lấy tin mới nhất hôm nay
router.get('/today', async (req, res) => {
    try {
        const [today] = await db.query(`
            SELECT ma_tin_tuc, tieu_de, hinh_anh, danh_muc, ngay_tao
            FROM tin_tuc
            WHERE trang_thai = 'hien_thi' AND DATE(ngay_tao) = CURDATE()
            ORDER BY ngay_tao DESC
            LIMIT 4
        `);

        // Nếu không có tin hôm nay, lấy tin mới nhất
        if (today.length === 0) {
            const [latest] = await db.query(`
                SELECT ma_tin_tuc, tieu_de, hinh_anh, danh_muc, ngay_tao
                FROM tin_tuc
                WHERE trang_thai = 'hien_thi'
                ORDER BY ngay_tao DESC
                LIMIT 4
            `);
            return res.json({ success: true, data: latest });
        }

        res.json({ success: true, data: today });
    } catch (error) {
        console.error('Get today news error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Lấy chi tiết tin tức
router.get('/:id', async (req, res) => {
    try {
        // Tăng lượt xem
        await db.query(`UPDATE tin_tuc SET luot_xem = luot_xem + 1 WHERE ma_tin_tuc = ?`, [req.params.id]);

        const [news] = await db.query(`
            SELECT * FROM tin_tuc WHERE ma_tin_tuc = ? AND trang_thai = 'hien_thi'
        `, [req.params.id]);

        if (news.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
        }

        // Lấy tin liên quan
        const [related] = await db.query(`
            SELECT ma_tin_tuc, tieu_de, hinh_anh, danh_muc, ngay_tao
            FROM tin_tuc
            WHERE trang_thai = 'hien_thi' AND ma_tin_tuc != ? AND danh_muc = ?
            ORDER BY ngay_tao DESC
            LIMIT 4
        `, [req.params.id, news[0].danh_muc]);

        res.json({ success: true, data: { ...news[0], related } });
    } catch (error) {
        console.error('Get news detail error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// ==========================================
// ADMIN API - Quản lý tin tức
// ==========================================

// Lấy tất cả tin tức (admin)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        const params = [];

        if (status) {
            whereClause += ` AND trang_thai = ?`;
            params.push(status);
        }
        if (search) {
            whereClause += ` AND (tieu_de LIKE ? OR mo_ta_ngan LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        const [news] = await db.query(`
            SELECT * FROM tin_tuc
            WHERE ${whereClause}
            ORDER BY ngay_tao DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM tin_tuc WHERE ${whereClause}`, params);

        res.json({
            success: true,
            data: news,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total
            }
        });
    } catch (error) {
        console.error('Admin get news error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Thêm tin tức mới
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tag, mau_tag, noi_bat, trang_thai } = req.body;

        if (!tieu_de) {
            return res.status(400).json({ success: false, message: 'Tiêu đề là bắt buộc' });
        }

        const [result] = await db.query(`
            INSERT INTO tin_tuc (tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tag, mau_tag, noi_bat, trang_thai, ma_tai_khoan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc || 'Công nghệ', tag || 'Tin tức', mau_tag || 'blue', noi_bat || 0, trang_thai || 'hien_thi', req.user.ma_tai_khoan]);

        res.status(201).json({
            success: true,
            message: 'Thêm tin tức thành công',
            data: { ma_tin_tuc: result.insertId }
        });
    } catch (error) {
        console.error('Create news error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Cập nhật tin tức
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tag, mau_tag, noi_bat, trang_thai } = req.body;

        await db.query(`
            UPDATE tin_tuc SET
                tieu_de = COALESCE(?, tieu_de),
                mo_ta_ngan = COALESCE(?, mo_ta_ngan),
                noi_dung = COALESCE(?, noi_dung),
                hinh_anh = COALESCE(?, hinh_anh),
                danh_muc = COALESCE(?, danh_muc),
                tag = COALESCE(?, tag),
                mau_tag = COALESCE(?, mau_tag),
                noi_bat = COALESCE(?, noi_bat),
                trang_thai = COALESCE(?, trang_thai)
            WHERE ma_tin_tuc = ?
        `, [tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tag, mau_tag, noi_bat, trang_thai, req.params.id]);

        res.json({ success: true, message: 'Cập nhật tin tức thành công' });
    } catch (error) {
        console.error('Update news error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Xóa tin tức
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query(`DELETE FROM tin_tuc WHERE ma_tin_tuc = ?`, [req.params.id]);
        res.json({ success: true, message: 'Xóa tin tức thành công' });
    } catch (error) {
        console.error('Delete news error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// Toggle nổi bật
router.put('/:id/toggle-featured', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query(`UPDATE tin_tuc SET noi_bat = IF(noi_bat = 1, 0, 1) WHERE ma_tin_tuc = ?`, [req.params.id]);
        res.json({ success: true, message: 'Cập nhật trạng thái nổi bật thành công' });
    } catch (error) {
        console.error('Toggle featured error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

module.exports = router;
