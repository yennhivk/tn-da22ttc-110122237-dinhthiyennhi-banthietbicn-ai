const db = require('../config/database');

async function initContactTable() {
    try {
        console.log('🔧 Creating lien_he table...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS lien_he (
                ma_lien_he INT AUTO_INCREMENT PRIMARY KEY,
                ho_ten VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                so_dien_thoai VARCHAR(20),
                chu_de VARCHAR(200) NOT NULL,
                noi_dung TEXT NOT NULL,
                trang_thai ENUM('chua_doc', 'da_doc', 'da_phan_hoi') DEFAULT 'chua_doc',
                phan_hoi TEXT,
                ngay_phan_hoi TIMESTAMP NULL,
                ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('✅ Table lien_he created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

initContactTable();
