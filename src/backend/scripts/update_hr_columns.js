const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    let connection;
    try {
        console.log('🔍 Connecting to database to migrate nhan_vien table...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'CSDL_DoAnCN',
            charset: 'utf8mb4'
        });

        console.log('✅ Connected to database!');

        // 1. Check existing columns in nhan_vien
        const [cols] = await connection.query('DESCRIBE nhan_vien');
        const colNames = cols.map(c => c.Field);

        // 2. Add ten_dang_nhap if not exists
        if (!colNames.includes('ten_dang_nhap')) {
            console.log('📦 Adding ten_dang_nhap column...');
            await connection.query('ALTER TABLE nhan_vien ADD COLUMN ten_dang_nhap VARCHAR(50) NULL AFTER ho_ten');
            console.log('✅ Added ten_dang_nhap column!');
        }

        // 3. Add mat_khau if not exists
        if (!colNames.includes('mat_khau')) {
            console.log('📦 Adding mat_khau column...');
            await connection.query('ALTER TABLE nhan_vien ADD COLUMN mat_khau VARCHAR(255) NULL AFTER ten_dang_nhap');
            console.log('✅ Added mat_khau column!');
        }

        // 4. Add anh_cccd_truoc if not exists
        if (!colNames.includes('anh_cccd_truoc')) {
            console.log('📦 Adding anh_cccd_truoc column...');
            await connection.query('ALTER TABLE nhan_vien ADD COLUMN anh_cccd_truoc VARCHAR(255) NULL AFTER ghi_chu');
            console.log('✅ Added anh_cccd_truoc column!');
        }

        // 5. Add anh_cccd_sau if not exists
        if (!colNames.includes('anh_cccd_sau')) {
            console.log('📦 Adding anh_cccd_sau column...');
            await connection.query('ALTER TABLE nhan_vien ADD COLUMN anh_cccd_sau VARCHAR(255) NULL AFTER anh_cccd_truoc');
            console.log('✅ Added anh_cccd_sau column!');
        }

        // 6. Check cham_cong for photo columns (e.g. checkin/checkout photos)
        const [attCols] = await connection.query('DESCRIBE cham_cong');
        const attColNames = attCols.map(c => c.Field);
        if (!attColNames.includes('anh_cham_cong')) {
            console.log('📦 Adding anh_cham_cong column...');
            await connection.query('ALTER TABLE cham_cong ADD COLUMN anh_cham_cong VARCHAR(255) NULL AFTER ghi_chu');
            console.log('✅ Added anh_cham_cong column!');
        }

        console.log('\n🎉 Database columns updated successfully!');
    } catch (e) {
        console.error('❌ Migration error:', e.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Connection closed.');
        }
    }
}

migrate();
