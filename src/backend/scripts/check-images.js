const db = require('../config/database');

async function checkImages() {
    try {
        // Kiểm tra tất cả sản phẩm và ảnh
        const [products] = await db.query(`
            SELECT sp.ma_san_pham, sp.ten_san_pham, 
                   asp.duong_dan_anh, asp.la_anh_chinh
            FROM san_pham sp
            LEFT JOIN anh_san_pham asp ON sp.ma_san_pham = asp.ma_san_pham
        `);
        
        console.log('=== TẤT CẢ SẢN PHẨM VÀ ẢNH ===');
        console.table(products);
        
        // Kiểm tra đơn hàng và chi tiết
        const [orders] = await db.query(`
            SELECT dh.ma_don_hang, ctdh.ma_san_pham, sp.ten_san_pham,
                   (SELECT duong_dan_anh FROM anh_san_pham WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh_chinh
            FROM don_hang dh
            JOIN chi_tiet_don_hang ctdh ON dh.ma_don_hang = ctdh.ma_don_hang
            LEFT JOIN san_pham sp ON ctdh.ma_san_pham = sp.ma_san_pham
            ORDER BY dh.ma_don_hang DESC
            LIMIT 10
        `);
        
        console.log('\n=== ĐƠN HÀNG GẦN ĐÂY VÀ ẢNH SẢN PHẨM ===');
        console.table(orders);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkImages();
