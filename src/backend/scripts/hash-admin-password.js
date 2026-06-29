const bcrypt = require('bcrypt');
const db = require('../config/database');

async function hashAdminPassword() {
    try {
        // Hash mật khẩu mới cho admin
        const plainPassword = '123456';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        
        console.log('🔐 Hashing admin password...');
        console.log('Plain:', plainPassword);
        console.log('Hashed:', hashedPassword);
        
        // Cập nhật mật khẩu admin trong database
        const [result] = await db.query(
            'UPDATE tai_khoan SET mat_khau = ? WHERE email = ? AND vai_tro = ?',
            [hashedPassword, 'admin@shop.vn', 'admin']
        );
        
        if (result.affectedRows > 0) {
            console.log('✅ Đã cập nhật mật khẩu admin thành công!');
            console.log('📧 Email: admin@shop.vn');
            console.log('🔑 Mật khẩu: 123456');
        } else {
            console.log('⚠️ Không tìm thấy tài khoản admin@shop.vn');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

hashAdminPassword();
