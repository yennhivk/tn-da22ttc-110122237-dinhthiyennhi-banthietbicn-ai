const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function updatePOSSystem() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'CSDL_DoAnCN',
            charset: 'utf8mb4'
        });

        console.log('✅ Kết nối database thành công!');

        // Xóa các bảng cũ
        console.log('\n🗑️  Đang xóa cấu trúc cũ...');
        await connection.query('DROP TABLE IF EXISTS giao_dich_pos');
        await connection.query('DROP TABLE IF EXISTS may_pos');
        
        // Tạo bảng hóa đơn bán hàng (thay thế may_pos)
        console.log('\n📦 Đang tạo bảng hoa_don_ban_hang...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS hoa_don_ban_hang (
                ma_hoa_don_bh INT AUTO_INCREMENT PRIMARY KEY,
                ma_hoa_don VARCHAR(50) UNIQUE NOT NULL,
                ma_khach_hang INT NULL,
                ten_khach_hang VARCHAR(100),
                so_dien_thoai VARCHAR(20),
                ma_nhan_vien INT NULL,
                ten_nhan_vien VARCHAR(100),
                ngay_ban DATETIME DEFAULT CURRENT_TIMESTAMP,
                tong_tien DECIMAL(15,2) NOT NULL DEFAULT 0,
                giam_gia DECIMAL(15,2) DEFAULT 0,
                thuc_thu DECIMAL(15,2) NOT NULL DEFAULT 0,
                phuong_thuc_thanh_toan ENUM('tien_mat','chuyen_khoan','the','momo','zalopay','cod') DEFAULT 'tien_mat',
                trang_thai ENUM('hoan_thanh','da_huy','cho_xu_ly') DEFAULT 'hoan_thanh',
                ghi_chu TEXT,
                FOREIGN KEY (ma_khach_hang) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE SET NULL
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Bảng hoa_don_ban_hang đã được tạo!');

        // Tạo bảng chi tiết hóa đơn bán hàng
        console.log('\n📦 Đang tạo bảng chi_tiet_hoa_don_bh...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS chi_tiet_hoa_don_bh (
                ma_chi_tiet INT AUTO_INCREMENT PRIMARY KEY,
                ma_hoa_don_bh INT NOT NULL,
                ma_san_pham INT NOT NULL,
                ten_san_pham VARCHAR(255),
                so_luong INT NOT NULL DEFAULT 1,
                don_gia DECIMAL(15,2) NOT NULL,
                giam_gia DECIMAL(15,2) DEFAULT 0,
                thanh_tien DECIMAL(15,2) NOT NULL,
                FOREIGN KEY (ma_hoa_don_bh) REFERENCES hoa_don_ban_hang(ma_hoa_don_bh) ON DELETE CASCADE,
                FOREIGN KEY (ma_san_pham) REFERENCES san_pham(ma_san_pham)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Bảng chi_tiet_hoa_don_bh đã được tạo!');

        // Tạo bảng nhân viên (nếu chưa có)
        console.log('\n📦 Đang tạo bảng nhan_vien...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS nhan_vien (
                ma_nhan_vien INT AUTO_INCREMENT PRIMARY KEY,
                ho_ten VARCHAR(100) NOT NULL,
                so_dien_thoai VARCHAR(20),
                email VARCHAR(100),
                chuc_vu VARCHAR(50),
                ngay_vao_lam DATE,
                luong_co_ban DECIMAL(15,2),
                trang_thai TINYINT DEFAULT 1,
                ghi_chu TEXT,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Bảng nhan_vien đã được tạo!');

        // Thêm dữ liệu mẫu nhân viên
        const [existingNV] = await connection.query('SELECT COUNT(*) as count FROM nhan_vien');
        if (existingNV[0].count === 0) {
            console.log('\n📝 Đang thêm nhân viên mẫu...');
            await connection.query(`
                INSERT INTO nhan_vien (ho_ten, so_dien_thoai, email, chuc_vu, ngay_vao_lam, luong_co_ban, trang_thai)
                VALUES
                ('Nguyễn Văn A', '0909123456', 'vana@yennhitech.vn', 'Nhân viên bán hàng', '2024-01-15', 8000000, 1),
                ('Trần Thị B', '0909234567', 'thib@yennhitech.vn', 'Thu ngân', '2024-02-01', 7500000, 1),
                ('Lê Văn C', '0909345678', 'vanc@yennhitech.vn', 'Quản lý cửa hàng', '2023-12-01', 12000000, 1)
            `);
            console.log('✅ Đã thêm 3 nhân viên mẫu!');
        }

        // Thêm dữ liệu hóa đơn bán hàng mẫu
        console.log('\n📝 Đang thêm hóa đơn bán hàng mẫu...');
        
        // Hóa đơn 1: Bán iPhone 15 Pro Max
        await connection.query(`
            INSERT INTO hoa_don_ban_hang 
            (ma_hoa_don, ma_khach_hang, ten_khach_hang, so_dien_thoai, ma_nhan_vien, ten_nhan_vien, 
             tong_tien, giam_gia, thuc_thu, phuong_thuc_thanh_toan, trang_thai)
            VALUES
            ('HD20250516001', 2, 'Nguyễn Văn A', '0909123456', 1, 'Nguyễn Văn A', 
             33990000, 0, 33990000, 'chuyen_khoan', 'hoan_thanh')
        `);
        const [hd1] = await connection.query('SELECT LAST_INSERT_ID() as id');
        await connection.query(`
            INSERT INTO chi_tiet_hoa_don_bh 
            (ma_hoa_don_bh, ma_san_pham, ten_san_pham, so_luong, don_gia, giam_gia, thanh_tien)
            VALUES
            (?, 1, 'iPhone 15 Pro Max', 1, 33990000, 0, 33990000)
        `, [hd1[0].id]);

        // Hóa đơn 2: Bán combo phụ kiện
        await connection.query(`
            INSERT INTO hoa_don_ban_hang 
            (ma_hoa_don, ten_khach_hang, so_dien_thoai, ma_nhan_vien, ten_nhan_vien, 
             tong_tien, giam_gia, thuc_thu, phuong_thuc_thanh_toan, trang_thai)
            VALUES
            ('HD20250516002', 'Khách lẻ', NULL, 2, 'Trần Thị B', 
             6980000, 100000, 6880000, 'tien_mat', 'hoan_thanh')
        `);
        const [hd2] = await connection.query('SELECT LAST_INSERT_ID() as id');
        await connection.query(`
            INSERT INTO chi_tiet_hoa_don_bh 
            (ma_hoa_don_bh, ma_san_pham, ten_san_pham, so_luong, don_gia, giam_gia, thanh_tien)
            VALUES
            (?, 5, 'Tai nghe AirPods Pro 2', 1, 5990000, 100000, 5890000),
            (?, 6, 'Sạc nhanh 65W Anker', 1, 990000, 0, 990000)
        `, [hd2[0].id, hd2[0].id]);

        // Hóa đơn 3: Bán Samsung Galaxy S24 Ultra
        await connection.query(`
            INSERT INTO hoa_don_ban_hang 
            (ma_hoa_don, ma_khach_hang, ten_khach_hang, so_dien_thoai, ma_nhan_vien, ten_nhan_vien, 
             tong_tien, giam_gia, thuc_thu, phuong_thuc_thanh_toan, trang_thai)
            VALUES
            ('HD20250516003', 3, 'Lê Thị B', '0909345678', 1, 'Nguyễn Văn A', 
             29990000, 500000, 29490000, 'the', 'hoan_thanh')
        `);
        const [hd3] = await connection.query('SELECT LAST_INSERT_ID() as id');
        await connection.query(`
            INSERT INTO chi_tiet_hoa_don_bh 
            (ma_hoa_don_bh, ma_san_pham, ten_san_pham, so_luong, don_gia, giam_gia, thanh_tien)
            VALUES
            (?, 2, 'Samsung Galaxy S24 Ultra', 1, 29990000, 500000, 29490000)
        `, [hd3[0].id]);

        console.log('✅ Đã thêm 3 hóa đơn bán hàng mẫu!');

        // Cập nhật số lượng tồn kho
        console.log('\n📦 Đang cập nhật tồn kho...');
        await connection.query('UPDATE san_pham SET so_luong = so_luong - 1 WHERE ma_san_pham = 1');
        await connection.query('UPDATE san_pham SET so_luong = so_luong - 1 WHERE ma_san_pham = 2');
        await connection.query('UPDATE san_pham SET so_luong = so_luong - 1 WHERE ma_san_pham = 5');
        await connection.query('UPDATE san_pham SET so_luong = so_luong - 1 WHERE ma_san_pham = 6');

        // Hiển thị thống kê
        const [invoices] = await connection.query('SELECT COUNT(*) as count FROM hoa_don_ban_hang');
        const [revenue] = await connection.query('SELECT SUM(thuc_thu) as total FROM hoa_don_ban_hang WHERE trang_thai = "hoan_thanh"');
        const [employees] = await connection.query('SELECT COUNT(*) as count FROM nhan_vien WHERE trang_thai = 1');
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 HỆ THỐNG POS ĐÃ SẴN SÀNG!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Tổng số hóa đơn: ${invoices[0].count}`);
        console.log(`💰 Doanh thu: ${revenue[0].total?.toLocaleString('vi-VN')} đ`);
        console.log(`👥 Số nhân viên: ${employees[0].count}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
        console.error(error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Đã đóng kết nối database.');
        }
    }
}

updatePOSSystem();
