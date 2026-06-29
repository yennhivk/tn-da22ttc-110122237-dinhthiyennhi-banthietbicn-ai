const db = require('./config/database');

const COLUMNS = [
    { name: 'ten_phap_ly', def: "VARCHAR(255) NULL COMMENT 'Tên đăng ký kinh doanh / pháp lý'" },
    { name: 'ma_so_thue', def: "VARCHAR(50) NULL COMMENT 'Mã số thuế'" },
    { name: 'slogan', def: "VARCHAR(255) NULL COMMENT 'Khẩu hiệu / mô tả ngắn'" },
    { name: 'mo_ta', def: "TEXT NULL COMMENT 'Mô tả dài về cửa hàng'" },
    { name: 'logo_url', def: "VARCHAR(500) NULL COMMENT 'URL logo cửa hàng'" },
    { name: 'website', def: "VARCHAR(255) NULL COMMENT 'Website chính thức'" },
    { name: 'facebook', def: "VARCHAR(255) NULL COMMENT 'Link Facebook'" },
    { name: 'zalo', def: "VARCHAR(50) NULL COMMENT 'Số/ID Zalo'" },
    { name: 'instagram', def: "VARCHAR(255) NULL COMMENT 'Link Instagram'" },
    { name: 'tiktok', def: "VARCHAR(255) NULL COMMENT 'Link TikTok'" },
    { name: 'gio_mo_cua', def: "VARCHAR(255) NULL COMMENT 'Giờ mở cửa'" }
];

async function columnExists(table, col) {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, col]
    );
    return rows[0].cnt > 0;
}

async function runMigration() {
    try {
        console.log('🚀 Mở rộng bảng thong_tin_cua_hang...\n');

        const table = 'thong_tin_cua_hang';
        let added = 0;
        let skipped = 0;

        for (const c of COLUMNS) {
            const exists = await columnExists(table, c.name);
            if (exists) {
                console.log(`⚠️  Cột ${c.name} đã tồn tại, bỏ qua`);
                skipped++;
                continue;
            }
            try {
                await db.query(`ALTER TABLE ${table} ADD COLUMN ${c.name} ${c.def}`);
                console.log(`✅ Đã thêm cột: ${c.name}`);
                added++;
            } catch (err) {
                console.error(`❌ Lỗi thêm cột ${c.name}:`, err.message);
            }
        }

        // Cập nhật dữ liệu mặc định cho cửa hàng đang là mặc định
        try {
            await db.query(`
                UPDATE thong_tin_cua_hang
                SET
                    ten_phap_ly = COALESCE(ten_phap_ly, 'CÔNG TY TNHH YẾN NHI TECH'),
                    slogan = COALESCE(slogan, 'Công nghệ chất lượng - Giá trị bền vững'),
                    website = COALESCE(website, 'www.yennhitechstore.com'),
                    gio_mo_cua = COALESCE(gio_mo_cua, 'T2-CN: 8:00 - 22:00')
                WHERE la_mac_dinh = TRUE
            `);
            console.log('✅ Đã cập nhật dữ liệu mặc định cho cửa hàng chính');
        } catch (err) {
            console.error('❌ Lỗi cập nhật dữ liệu mặc định:', err.message);
        }

        console.log(`\n✅ Migration hoàn tất! (Thêm: ${added}, Bỏ qua: ${skipped})`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration thất bại:', error);
        process.exit(1);
    }
}

runMigration();
