// =========================================
// Script cập nhật tài khoản yennhivk82@gmail.com thành admin
// =========================================

const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateAdminAccount() {
    let connection;
    
    try {
        // Kết nối database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'CSDL_DoAnCN',
            charset: 'utf8mb4'
        });

        console.log('✅ Kết nối database thành công!');

        // Cập nhật vai trò admin
        const email = 'yennhivk82@gmail.com';
        const [result] = await connection.execute(
            'UPDATE tai_khoan SET vai_tro = ? WHERE email = ?',
            ['admin', email]
        );

        console.log(`📝 Số dòng đã cập nhật: ${result.affectedRows}`);

        if (result.affectedRows === 0) {
            console.log('⚠️  Không tìm thấy tài khoản với email:', email);
        } else {
            console.log('✨ Đã cập nhật tài khoản thành admin!');
        }

        // Kiểm tra kết quả
        const [rows] = await connection.execute(
            'SELECT ma_tai_khoan, ten_dang_nhap, email, vai_tro, google_id, trang_thai FROM tai_khoan WHERE email = ?',
            [email]
        );

        if (rows.length > 0) {
            console.log('\n📊 Thông tin tài khoản sau khi cập nhật:');
            console.log('─────────────────────────────────────────');
            console.log('ID:', rows[0].ma_tai_khoan);
            console.log('Tên đăng nhập:', rows[0].ten_dang_nhap);
            console.log('Email:', rows[0].email);
            console.log('Vai trò:', rows[0].vai_tro);
            console.log('Google ID:', rows[0].google_id);
            console.log('Trạng thái:', rows[0].trang_thai === 1 ? 'Hoạt động' : 'Bị khóa');
            console.log('─────────────────────────────────────────');
        }

        console.log('\n✅ Hoàn tất! Bây giờ tài khoản yennhivk82@gmail.com có thể đăng nhập vào trang admin.');

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Đã đóng kết nối database.');
        }
    }
}

// Chạy script
updateAdminAccount();
