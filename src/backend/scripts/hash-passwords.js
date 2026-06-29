const bcrypt = require('bcrypt');
const db = require('../config/database');

async function hashExistingPasswords() {
    try {
        console.log('🔄 Đang kiểm tra và mã hóa mật khẩu...\n');

        // Lấy tất cả tài khoản
        const [users] = await db.query('SELECT ma_tai_khoan, ten_dang_nhap, mat_khau FROM tai_khoan');

        for (const user of users) {
            // Kiểm tra xem mật khẩu đã được hash chưa (bcrypt hash bắt đầu bằng $2b$)
            if (!user.mat_khau.startsWith('$2b$')) {
                console.log(`🔐 Mã hóa mật khẩu cho: ${user.ten_dang_nhap}`);
                const hashedPassword = await bcrypt.hash(user.mat_khau, 10);
                
                await db.query(
                    'UPDATE tai_khoan SET mat_khau = ? WHERE ma_tai_khoan = ?',
                    [hashedPassword, user.ma_tai_khoan]
                );
                
                console.log(`✅ Đã mã hóa mật khẩu cho: ${user.ten_dang_nhap}`);
            } else {
                console.log(`⏭️  Bỏ qua ${user.ten_dang_nhap} (đã được mã hóa)`);
            }
        }

        console.log('\n✅ Hoàn thành mã hóa mật khẩu!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

hashExistingPasswords();
