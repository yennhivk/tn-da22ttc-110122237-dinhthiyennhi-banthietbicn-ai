const db = require('../config/database');

async function createArticlesTable() {
    try {
        // Tạo bảng bai_viet
        await db.query(`
            CREATE TABLE IF NOT EXISTS bai_viet (
                ma_bai_viet INT AUTO_INCREMENT PRIMARY KEY,
                tieu_de VARCHAR(500) NOT NULL,
                mo_ta_ngan TEXT,
                noi_dung LONGTEXT,
                hinh_anh VARCHAR(500),
                danh_muc ENUM('huong_dan', 'danh_gia', 'meo_vat', 'so_sanh') DEFAULT 'huong_dan',
                tac_gia VARCHAR(100) DEFAULT 'Admin',
                tags VARCHAR(255),
                luot_xem INT DEFAULT 0,
                trang_thai ENUM('xuat_ban', 'nhap', 'an') DEFAULT 'xuat_ban',
                ma_tai_khoan INT,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Đã tạo bảng bai_viet');

        // Kiểm tra xem đã có dữ liệu chưa
        const [rows] = await db.query('SELECT COUNT(*) as cnt FROM bai_viet');
        if (rows[0].cnt === 0) {
            // Thêm dữ liệu mẫu
            await db.query(`
                INSERT INTO bai_viet (tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tac_gia, tags, trang_thai) VALUES
                ('Hướng dẫn chọn mua laptop phù hợp năm 2024', 'Bài viết hướng dẫn chi tiết cách chọn laptop phù hợp với nhu cầu sử dụng', 'Nội dung chi tiết về cách chọn laptop...', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800', 'huong_dan', 'Admin', 'laptop, mua sắm, hướng dẫn', 'xuat_ban'),
                ('Đánh giá iPhone 15 Pro Max sau 3 tháng sử dụng', 'Review chi tiết iPhone 15 Pro Max với những trải nghiệm thực tế', 'Nội dung đánh giá chi tiết...', 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800', 'danh_gia', 'Admin', 'iphone, review, apple', 'xuat_ban'),
                ('10 mẹo tiết kiệm pin cho điện thoại Android', 'Những mẹo đơn giản giúp kéo dài thời lượng pin điện thoại', 'Nội dung các mẹo tiết kiệm pin...', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800', 'meo_vat', 'Admin', 'android, pin, mẹo vặt', 'xuat_ban')
            `);
            console.log('✅ Đã thêm dữ liệu mẫu');
        } else {
            console.log('ℹ️ Bảng đã có dữ liệu, bỏ qua thêm mẫu');
        }

        console.log('🎉 Hoàn tất!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

createArticlesTable();
