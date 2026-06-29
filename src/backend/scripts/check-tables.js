// Script kiểm tra các bảng trong database
const db = require('../config/database');

async function checkTables() {
    console.log('🔍 Kiểm tra database...\n');
    
    try {
        // Kiểm tra bảng don_hang
        console.log('📋 Kiểm tra bảng don_hang:');
        try {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM don_hang');
            console.log('   ✅ Bảng don_hang tồn tại, có', rows[0].count, 'đơn hàng');
        } catch (e) {
            console.log('   ❌ Bảng don_hang không tồn tại:', e.message);
        }

        // Kiểm tra bảng tai_khoan
        console.log('\n📋 Kiểm tra bảng tai_khoan:');
        try {
            const [rows] = await db.query('SELECT COUNT(*) as count FROM tai_khoan');
            console.log('   ✅ Bảng tai_khoan tồn tại, có', rows[0].count, 'tài khoản');
        } catch (e) {
            console.log('   ❌ Bảng tai_khoan không tồn tại:', e.message);
        }

        // Kiểm tra cấu trúc bảng don_hang
        console.log('\n📋 Cấu trúc bảng don_hang:');
        try {
            const [columns] = await db.query('DESCRIBE don_hang');
            columns.forEach(col => {
                console.log('   -', col.Field, ':', col.Type);
            });
        } catch (e) {
            console.log('   ❌ Không thể đọc cấu trúc:', e.message);
        }

        console.log('\n✅ Kiểm tra hoàn tất!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    }
}

checkTables();
