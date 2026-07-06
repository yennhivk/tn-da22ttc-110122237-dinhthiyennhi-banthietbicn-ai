const db = require('../config/database');

async function main() {
    try {
        const q = 'iphone 17 thuong';
        console.log(`Testing search queries for unaccented: "${q}"`);

        // Test suggestions query
        const queryStr = `%${q}%`;
        const [suggestions] = await db.query(`
            SELECT 
                sp.ma_san_pham,
                sp.ten_san_pham,
                sp.thuong_hieu,
                sp.gia
            FROM san_pham sp
            LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
            WHERE sp.trang_thai = 'hien_thi' 
              AND (sp.ten_san_pham LIKE ? OR dm.ten_danh_muc LIKE ? OR sp.thuong_hieu LIKE ? OR EXISTS (SELECT 1 FROM anh_san_pham a WHERE a.ma_san_pham = sp.ma_san_pham AND a.duong_dan_anh LIKE ?))
            LIMIT 8
        `, [queryStr, queryStr, queryStr, '%' + q.replace(/\s+/g, '%') + '%']);
        
        console.log('Results:', suggestions);
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit();
}

main();
