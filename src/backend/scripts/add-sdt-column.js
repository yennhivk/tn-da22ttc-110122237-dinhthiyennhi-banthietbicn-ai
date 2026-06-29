// Script để thêm cột số điện thoại vào bảng tai_khoan
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSoDienThoaiColumn() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'CSDL_DoAnCN'
    });

    try {
        console.log('Đang kiểm tra và thêm cột so_dien_thoai...');
        
        // Kiểm tra xem cột đã tồn tại chưa
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tai_khoan' AND COLUMN_NAME = 'so_dien_thoai'
        `, [process.env.DB_NAME || 'CSDL_DoAnCN']);
        
        if (columns.length === 0) {
            // Thêm cột so_dien_thoai
            await connection.query(`
                ALTER TABLE tai_khoan 
                ADD COLUMN so_dien_thoai VARCHAR(20) DEFAULT NULL AFTER email
            `);
            console.log('✅ Đã thêm cột so_dien_thoai thành công!');
        } else {
            console.log('ℹ️  Cột so_dien_thoai đã tồn tại!');
        }
        
        // Cập nhật một số SĐT mẫu
        await connection.query(`UPDATE tai_khoan SET so_dien_thoai = '0337878399' WHERE ma_tai_khoan = 2`);
        await connection.query(`UPDATE tai_khoan SET so_dien_thoai = '0335261859' WHERE ma_tai_khoan = 3`);
        await connection.query(`UPDATE tai_khoan SET so_dien_thoai = '0909123456' WHERE ma_tai_khoan = 4`);
        
        console.log('✅ Đã cập nhật số điện thoại mẫu!');
        
        // Kiểm tra kết quả
        const [rows] = await connection.query(`SELECT ma_tai_khoan, ten_dang_nhap, email, so_dien_thoai FROM tai_khoan LIMIT 5`);
        console.log('\n📋 Dữ liệu mẫu:');
        console.table(rows);
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await connection.end();
    }
}

addSoDienThoaiColumn();
