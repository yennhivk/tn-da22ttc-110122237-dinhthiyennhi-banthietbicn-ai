const db = require('../config/database');

async function runMigration() {
    try {
        console.log('⏳ Dang them cot muc_dich_su_dung vao bang san_pham...');
        
        // Kiểm tra xem cột đã tồn tại chưa
        const [columns] = await db.query(`SHOW COLUMNS FROM san_pham LIKE 'muc_dich_su_dung'`);
        if (columns.length > 0) {
            console.log('✅ Cột muc_dich_su_dung đã tồn tại trong bảng san_pham!');
            process.exit(0);
        }

        // Thêm cột
        await db.query(`ALTER TABLE san_pham ADD COLUMN muc_dich_su_dung VARCHAR(255) NULL`);
        console.log('✅ Da them cot muc_dich_su_dung thanh cong!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Loi khi them cot:', err);
        process.exit(1);
    }
}

runMigration();
