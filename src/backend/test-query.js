require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    // Test 1: Doanh thu 7 ngày qua (06/01 - 12/01/2026)
    const [revenue] = await conn.query(`
        SELECT COALESCE(SUM(tong_tien), 0) as total 
        FROM don_hang 
        WHERE trang_thai_don_hang IN ('hoan_thanh', 'dang_xu_ly', 'dang_giao', 'cho_xac_nhan') 
        AND DATE(ngay_tao) BETWEEN '2026-01-06' AND '2026-01-12'
    `);
    console.log('Revenue 7 days:', revenue);
    
    // Test 2: Đơn hàng trong khoảng ngày
    const [orders] = await conn.query(`
        SELECT ma_don_hang, tong_tien, trang_thai_don_hang, ngay_tao, DATE(ngay_tao) as date_only
        FROM don_hang 
        WHERE DATE(ngay_tao) BETWEEN '2026-01-06' AND '2026-01-12'
    `);
    console.log('Orders in range:', orders);
    
    // Test 3: Khách hàng có đơn hàng
    const [customers] = await conn.query(`
        SELECT COUNT(DISTINCT ma_tai_khoan) as total 
        FROM don_hang 
        WHERE ma_tai_khoan IS NOT NULL 
        AND DATE(ngay_tao) BETWEEN '2026-01-06' AND '2026-01-12'
    `);
    console.log('Customers:', customers);
    
    // Test 4: Kiểm tra ngày thực tế trong database
    const [dates] = await conn.query(`
        SELECT ma_don_hang, ngay_tao, DATE(ngay_tao) as date_vn
        FROM don_hang 
        ORDER BY ngay_tao DESC LIMIT 10
    `);
    console.log('Dates check:', dates);
    
    await conn.end();
})();
