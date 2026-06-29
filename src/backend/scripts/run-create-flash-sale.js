const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createFlashSaleTable() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true
        });

        console.log('✅ Kết nối database thành công');

        const sql = fs.readFileSync(path.join(__dirname, 'create-flash-sale-table.sql'), 'utf8');
        
        await connection.query(sql);
        
        console.log('✅ Đã tạo bảng flash_sale thành công!');
        console.log('📊 Bảng flash_sale đã sẵn sàng để sử dụng');

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Đã đóng kết nối database');
        }
    }
}

createFlashSaleTable();
