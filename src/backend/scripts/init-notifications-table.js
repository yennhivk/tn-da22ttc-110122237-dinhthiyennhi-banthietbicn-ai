const db = require('../config/database');

async function init() {
    try {
        console.log('🔧 Creating thong_bao table...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS thong_bao (
                ma_thong_bao INT AUTO_INCREMENT PRIMARY KEY,
                ma_tai_khoan INT DEFAULT NULL,
                loai_thong_bao ENUM('order', 'promotion', 'system', 'news') DEFAULT 'system',
                tieu_de VARCHAR(255) NOT NULL,
                noi_dung TEXT,
                duong_dan VARCHAR(255) DEFAULT NULL,
                da_doc TINYINT(1) DEFAULT 0,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('✅ Table thong_bao created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

init();
