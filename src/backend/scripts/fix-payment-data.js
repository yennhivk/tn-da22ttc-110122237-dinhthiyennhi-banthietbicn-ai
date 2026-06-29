const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixPaymentData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'CSDL_DoAnCN'
    });

    try {
        console.log('🔄 Đang cập nhật dữ liệu thanh toán...');
        
        // Thêm phương thức thanh toán cho các đơn hàng chưa có
        const [result] = await connection.query(`
            INSERT INTO thanh_toan (ma_don_hang, phuong_thuc, so_tien, ma_giao_dich)
            SELECT dh.ma_don_hang, 
                   ELT(FLOOR(1 + RAND() * 4), 'COD', 'Momo', 'Ngan_Hang', 'ZaloPay'),
                   dh.tong_tien,
                   CONCAT('GD', dh.ma_don_hang, UNIX_TIMESTAMP())
            FROM don_hang dh
            WHERE dh.ma_don_hang NOT IN (SELECT ma_don_hang FROM thanh_toan WHERE ma_don_hang IS NOT NULL)
        `);
        
        console.log(`✅ Đã thêm ${result.affectedRows} bản ghi thanh toán`);
        
        // Kiểm tra kết quả
        const [stats] = await connection.query(`
            SELECT phuong_thuc, COUNT(*) as so_don, SUM(so_tien) as tong_tien
            FROM thanh_toan
            GROUP BY phuong_thuc
        `);
        
        console.log('\n📊 Thống kê phương thức thanh toán:');
        stats.forEach(s => {
            console.log(`   ${s.phuong_thuc}: ${s.so_don} đơn - ${Number(s.tong_tien).toLocaleString('vi-VN')}đ`);
        });
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await connection.end();
    }
}

fixPaymentData();
