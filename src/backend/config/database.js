const mysql = require('mysql2/promise');
require('dotenv').config();

// Tạo connection pool để quản lý kết nối hiệu quả
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'CSDL_DoAnCN',
    charset: process.env.DB_CHARSET || 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test kết nối khi khởi động
pool.getConnection()
    .then(connection => {
        console.log('✅ Kết nối database MySQL thành công!');
        console.log(`📦 Database: ${process.env.DB_NAME}`);
        console.log(`🔗 Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        connection.release();
    })
    .catch(err => {
        console.error('❌ Lỗi kết nối database:', err.message);
        console.error('💡 Kiểm tra lại thông tin trong file .env');
    });

module.exports = pool;
