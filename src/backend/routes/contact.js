const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Gửi tin nhắn liên hệ (Public)
router.post('/', async (req, res) => {
    console.log('📩 Contact POST request received');
    console.log('📦 Request body:', req.body);
    
    try {
        const { ho_ten, email, so_dien_thoai, chu_de, noi_dung } = req.body;

        // Validation
        if (!ho_ten || !email || !noi_dung) {
            console.log('❌ Validation failed: missing fields');
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc!'
            });
        }

        if (noi_dung.length < 50) {
            console.log('❌ Validation failed: message too short');
            return res.status(400).json({
                success: false,
                message: 'Nội dung tin nhắn phải có ít nhất 50 ký tự!'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('❌ Validation failed: invalid email');
            return res.status(400).json({
                success: false,
                message: 'Email không hợp lệ!'
            });
        }

        console.log('✅ Validation passed, inserting data...');

        // Insert into database
        const [result] = await db.query(`
            INSERT INTO lien_he (ho_ten, email, so_dien_thoai, chu_de, noi_dung, trang_thai)
            VALUES (?, ?, ?, ?, ?, 'chua_phan_hoi')
        `, [ho_ten, email, so_dien_thoai || null, chu_de || '', noi_dung]);

        console.log('✅ Insert successful, ID:', result.insertId);

        res.json({
            success: true,
            message: 'Tin nhắn đã được gửi thành công! Chúng tôi sẽ phản hồi sớm nhất.',
            data: { ma_lien_he: result.insertId }
        });

    } catch (error) {
        console.error('❌ Contact error:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra, vui lòng thử lại: ' + error.message
        });
    }
});

// Lấy danh sách tin nhắn liên hệ (cho admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { trang_thai, page = 1, limit = 20, search } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        const params = [];

        if (trang_thai && trang_thai !== 'all') {
            whereClause += ' AND trang_thai = ?';
            params.push(trang_thai);
        }

        if (search) {
            whereClause += ' AND (COALESCE(ho_ten, ten_nguoi_gui, "") LIKE ? OR email LIKE ? OR COALESCE(chu_de, "") LIKE ? OR noi_dung LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Đếm tổng
        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM lien_he WHERE ${whereClause}`, params);
        const total = countResult[0].total;

        // Lấy danh sách - sử dụng COALESCE để hỗ trợ cả cột cũ và mới
        const [contacts] = await db.query(`
            SELECT 
                ma_lien_he,
                COALESCE(ho_ten, ten_nguoi_gui) as ho_ten,
                email,
                so_dien_thoai,
                COALESCE(chu_de, '') as chu_de,
                noi_dung,
                trang_thai,
                COALESCE(ngay_gui, NOW()) as ngay_tao
            FROM lien_he 
            WHERE ${whereClause}
            ORDER BY 
                CASE trang_thai 
                    WHEN 'chua_phan_hoi' THEN 1 
                    WHEN 'da_phan_hoi' THEN 2 
                    ELSE 3 
                END,
                ngay_gui DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Đếm theo trạng thái
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN trang_thai = 'chua_phan_hoi' THEN 1 ELSE 0 END) as chua_phan_hoi,
                SUM(CASE WHEN trang_thai = 'da_phan_hoi' THEN 1 ELSE 0 END) as da_phan_hoi
            FROM lien_he
        `);

        res.json({
            success: true,
            data: contacts,
            stats: stats[0],
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra: ' + error.message
        });
    }
});

// Cập nhật trạng thái tin nhắn
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { trang_thai } = req.body;

        const validStatus = ['chua_phan_hoi', 'da_phan_hoi'];
        if (!validStatus.includes(trang_thai)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ!'
            });
        }

        await db.query('UPDATE lien_he SET trang_thai = ? WHERE ma_lien_he = ?', [trang_thai, id]);

        res.json({
            success: true,
            message: 'Cập nhật trạng thái thành công!'
        });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra!'
        });
    }
});

// Phản hồi liên hệ
router.put('/:id/reply', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { phan_hoi } = req.body;

        if (!phan_hoi || phan_hoi.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Nội dung phản hồi không được để trống!'
            });
        }

        // Kiểm tra liên hệ tồn tại
        const [contacts] = await db.query('SELECT *, COALESCE(ho_ten, ten_nguoi_gui) as ten FROM lien_he WHERE ma_lien_he = ?', [id]);
        if (contacts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy liên hệ!'
            });
        }

        const contact = contacts[0];

        // Cập nhật phản hồi
        await db.query(`
            UPDATE lien_he 
            SET phan_hoi = ?, trang_thai = 'da_phan_hoi', ngay_phan_hoi = NOW()
            WHERE ma_lien_he = ?
        `, [phan_hoi.trim(), id]);

        // Tìm tài khoản người dùng dựa trên email để gửi thông báo
        try {
            const [users] = await db.query('SELECT ma_tai_khoan FROM tai_khoan WHERE email = ?', [contact.email]);
            
            if (users.length > 0) {
                // Tạo thông báo cho người dùng
                await db.query(`
                    INSERT INTO thong_bao (ma_tai_khoan, loai_thong_bao, tieu_de, noi_dung, duong_dan, da_doc)
                    VALUES (?, 'system', ?, ?, ?, 0)
                `, [
                    users[0].ma_tai_khoan,
                    `Phản hồi liên hệ: ${contact.chu_de || 'Tin nhắn của bạn'}`,
                    phan_hoi.trim(),
                    'notifications.html'
                ]);
                console.log('✅ Đã tạo thông báo cho người dùng:', contact.email);
            } else {
                console.log('⚠️ Không tìm thấy tài khoản với email:', contact.email);
            }
        } catch (notifyError) {
            console.log('⚠️ Không thể tạo thông báo:', notifyError.message);
        }

        // Gửi email phản hồi (nếu có cấu hình mailer)
        try {
            const mailer = require('../config/mailer');
            if (mailer && mailer.sendMail) {
                await mailer.sendMail({
                    to: contact.email,
                    subject: `Re: ${contact.chu_de || 'Liên hệ'} - Yến Nhi Tech`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #1e40af;">Phản hồi từ Yến Nhi Tech</h2>
                            <p>Xin chào <strong>${contact.ten || 'Quý khách'}</strong>,</p>
                            <p>Cảm ơn bạn đã liên hệ với chúng tôi. Dưới đây là phản hồi cho câu hỏi của bạn:</p>
                            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p style="color: #374151; margin: 0;">${phan_hoi}</p>
                            </div>
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                            <p style="color: #6b7280; font-size: 14px;">
                                <strong>Tin nhắn gốc của bạn:</strong><br>
                                ${contact.noi_dung}
                            </p>
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                            <p style="color: #6b7280; font-size: 12px;">
                                Yến Nhi Tech - 74-76 Lê Lợi, Trà Vinh<br>
                                Hotline: 028.6670.4455 | Email: yennhitech@gmail.com
                            </p>
                        </div>
                    `
                });
                console.log('✅ Email phản hồi đã được gửi đến:', contact.email);
            }
        } catch (emailError) {
            console.log('⚠️ Không thể gửi email phản hồi:', emailError.message);
        }

        res.json({
            success: true,
            message: 'Phản hồi thành công!'
        });

    } catch (error) {
        console.error('Reply contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra!'
        });
    }
});

// Xóa tin nhắn
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM lien_he WHERE ma_lien_he = ?', [id]);

        res.json({
            success: true,
            message: 'Xóa tin nhắn thành công!'
        });

    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra!'
        });
    }
});

// Đếm tin nhắn chưa đọc
router.get('/unread-count', async (req, res) => {
    try {
        const [result] = await db.query("SELECT COUNT(*) as count FROM lien_he WHERE trang_thai = 'chua_doc'");

        res.json({
            success: true,
            count: result[0].count
        });

    } catch (error) {
        console.error('Count unread error:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra!'
        });
    }
});

module.exports = router;
