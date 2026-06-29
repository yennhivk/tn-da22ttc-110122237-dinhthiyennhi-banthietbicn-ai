// Script sửa bảng don_hang
require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function fixTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('🔗 Đã kết nối database');

    try {
        // Kiểm tra cấu trúc bảng
        const [columns] = await connection.query('DESCRIBE don_hang');
        const columnNames = columns.map(c => c.Field);
        console.log('📋 Các cột hiện có:', columnNames);

        // Thêm các cột còn thiếu
        const alterQueries = [];

        if (!columnNames.includes('trang_thai')) {
            alterQueries.push(`ALTER TABLE don_hang ADD COLUMN trang_thai ENUM('cho_xac_nhan','da_xac_nhan','dang_giao','da_giao','da_huy') DEFAULT 'cho_xac_nhan'`);
        }
        if (!columnNames.includes('dia_chi_giao')) {
            alterQueries.push(`ALTER TABLE don_hang ADD COLUMN dia_chi_giao TEXT`);
        }
        if (!columnNames.includes('so_dien_thoai')) {
            alterQueries.push(`ALTER TABLE don_hang ADD COLUMN so_dien_thoai VARCHAR(20)`);
        }
        if (!columnNames.includes('ghi_chu')) {
            alterQueries.push(`ALTER TABLE don_hang ADD COLUMN ghi_chu TEXT`);
        }
        if (!columnNames.includes('ngay_dat')) {
            alterQueries.push(`ALTER TABLE don_hang ADD COLUMN ngay_dat DATETIME DEFAULT CURRENT_TIMESTAMP`);
        }
        if (!columnNames.includes('ngay_cap_nhat')) {
            alterQueries.push(`ALTER TABLE don_hang ADD COLUMN ngay_cap_nhat DATETIME`);
        }

        for (const query of alterQueries) {
            console.log('🔧 Chạy:', query);
            await connection.query(query);
            console.log('✅ Thành công');
        }

        // Copy dữ liệu từ cột cũ
        if (columnNames.includes('trang_thai_don_hang')) {
            console.log('📝 Copy dữ liệu từ trang_thai_don_hang...');
            await connection.query(`
                UPDATE don_hang SET trang_thai = 
                    CASE trang_thai_don_hang
                        WHEN 'dang_xu_ly' THEN 'cho_xac_nhan'
                        WHEN 'dang_giao' THEN 'dang_giao'
                        WHEN 'hoan_thanh' THEN 'da_giao'
                        WHEN 'da_huy' THEN 'da_huy'
                        ELSE 'cho_xac_nhan'
                    END
                WHERE trang_thai IS NULL OR trang_thai = ''
            `);
        }

        if (columnNames.includes('dia_chi_giao_hang')) {
            console.log('📝 Copy dữ liệu từ dia_chi_giao_hang...');
            await connection.query(`UPDATE don_hang SET dia_chi_giao = dia_chi_giao_hang WHERE dia_chi_giao IS NULL`);
        }

        if (columnNames.includes('ngay_tao') && !columnNames.includes('ngay_dat')) {
            // Đã thêm ngay_dat ở trên
        } else if (columnNames.includes('ngay_tao')) {
            console.log('📝 Copy dữ liệu từ ngay_tao...');
            await connection.query(`UPDATE don_hang SET ngay_dat = ngay_tao WHERE ngay_dat IS NULL`);
        }

        // Kiểm tra lại
        const [newColumns] = await connection.query('DESCRIBE don_hang');
        console.log('\n✅ Cấu trúc bảng sau khi sửa:');
        newColumns.forEach(c => console.log(`  - ${c.Field}: ${c.Type}`));

        const [rows] = await connection.query('SELECT COUNT(*) as count FROM don_hang');
        console.log(`\n📊 Tổng số đơn hàng: ${rows[0].count}`);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await connection.end();
        console.log('\n🔌 Đã đóng kết nối');
    }
}

fixTable();
