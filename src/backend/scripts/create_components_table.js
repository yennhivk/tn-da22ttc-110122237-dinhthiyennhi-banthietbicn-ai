const db = require('../config/database');

async function migrate() {
    try {
        console.log('🚀 Starting Database Migration: Creating "linh_kien" table...');

        // 1. Create table
        await db.query(`
            CREATE TABLE IF NOT EXISTS linh_kien (
                ma_linh_kien INT AUTO_INCREMENT PRIMARY KEY,
                ten_linh_kien VARCHAR(255) NOT NULL,
                loai_linh_kien VARCHAR(100) NOT NULL,
                tuong_thich VARCHAR(255) NOT NULL,
                ma_nha_cung_cap INT,
                gia_nhap DECIMAL(15,2) NOT NULL DEFAULT 0,
                gia_ban DECIMAL(15,2) NOT NULL DEFAULT 0,
                so_luong_ton INT NOT NULL DEFAULT 0,
                vi_tri_kho VARCHAR(100),
                trang_thai ENUM('con_hang', 'het_hang', 'ngung_su_dung') DEFAULT 'con_hang',
                ghi_chu TEXT,
                ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (ma_nha_cung_cap) REFERENCES nha_cung_cap(ma_nha_cung_cap) ON DELETE SET NULL
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Table "linh_kien" created or already exists.');

        // 2. Check if table already has seed data
        const [rows] = await db.query('SELECT COUNT(*) as count FROM linh_kien');
        const count = rows[0]?.count || 0;

        if (count === 0) {
            console.log('🌱 Seeding "linh_kien" table with premium initial components...');

            const seedQuery = `
                INSERT INTO linh_kien (ten_linh_kien, loai_linh_kien, tuong_thich, ma_nha_cung_cap, gia_nhap, gia_ban, so_luong_ton, vi_tri_kho, trang_thai, ghi_chu)
                VALUES 
                ('Màn hình Super Retina XDR OLED', 'Màn hình', 'iPhone 15 Pro Max', 1, 8500000.00, 11500000.00, 12, 'Kệ A - Ngăn 1', 'con_hang', 'Màn hình chính hãng Apple phân phối'),
                ('Màn hình Dynamic AMOLED 2X', 'Màn hình', 'Samsung Galaxy S24 Ultra', 3, 7200000.00, 9900000.00, 8, 'Kệ A - Ngăn 2', 'con_hang', 'Màn hình Dynamic Amoled Samsung chính hãng'),
                ('Pin Lithium-ion 4441 mAh', 'Pin', 'iPhone 15 Pro Max', 1, 950000.00, 1500000.00, 25, 'Kệ B - Ngăn 1', 'con_hang', 'Pin zin bóc máy hoặc phân phối chính hãng'),
                ('Pin Li-Po dung lượng cực cao', 'Pin', 'Samsung Galaxy S24 Ultra', 5, 800000.00, 1300000.00, 18, 'Kệ B - Ngăn 2', 'con_hang', 'Pin linh kiện thương hiệu cao cấp'),
                ('Camera chính 200MP OIS', 'Camera', 'Samsung Galaxy S24 Ultra', 3, 3100000.00, 4500000.00, 4, 'Hộp kỹ thuật C1', 'con_hang', 'Cụm camera góc rộng 200 Megapixels'),
                ('SSD Samsung 990 Pro M.2 PCIe 4.0 1TB', 'SSD/RAM', 'MacBook Air M3 2024 / Laptop', 2, 1850000.00, 2600000.00, 15, 'Tủ linh kiện laptop L1', 'con_hang', 'SSD tốc độ đọc 7450 MB/s chính hãng'),
                ('Cụm camera TrueDepth & Face ID', 'Camera', 'iPhone 15 Pro Max', 1, 2400000.00, 3500000.00, 2, 'Hộp kỹ thuật C2', 'con_hang', 'Cụm camera trước hỗ trợ Face ID'),
                ('RAM Crucial DDR5 16GB 4800MHz', 'SSD/RAM', 'Laptop Dell / HP', 2, 1100000.00, 1650000.00, 30, 'Tủ linh kiện laptop L2', 'con_hang', 'RAM DDR5 hiệu năng cao cho laptop'),
                ('Mặt kính lưng Titanium Gray', 'Linh kiện khác', 'iPhone 15 Pro Max', 1, 1200000.00, 2200000.00, 0, 'Kệ D - Ngăn 4', 'het_hang', 'Mặt kính lưng chất liệu Titanium sang trọng'),
                ('Cổng sạc USB-C và cáp kết nối', 'Linh kiện khác', 'iPhone 15 Pro Max', 4, 450000.00, 800000.00, 10, 'Kệ D - Ngăn 1', 'con_hang', 'Đuôi sạc kèm cáp nguồn sạc USB-C')
            `;

            await db.query(seedQuery);
            console.log('✅ Seeded 10 high-quality component records successfully!');
        } else {
            console.log('ℹ️ Table "linh_kien" already has data. Skipping seeding.');
        }

        console.log('✨ Migration Completed Successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Error:', err.message);
        process.exit(1);
    }
}

migrate();
