/**
 * Script kiểm tra nhân viên trong database
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkEmployees() {
    let connection;
    
    try {
        console.log('🔌 Connecting to database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'yen_nhi_tech'
        });

        console.log('✅ Connected to database\n');

        // 1. Kiểm tra bảng nhan_vien
        console.log('📋 1. Checking nhan_vien table...');
        const [tables] = await connection.query(`
            SHOW TABLES LIKE 'nhan_vien'
        `);
        
        if (tables.length === 0) {
            console.log('❌ Table nhan_vien does not exist!');
            return;
        }
        console.log('✅ Table nhan_vien exists\n');

        // 2. Đếm số nhân viên
        console.log('📋 2. Counting employees...');
        const [count] = await connection.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN trang_thai = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN trang_thai = 0 THEN 1 ELSE 0 END) as inactive
            FROM nhan_vien
        `);
        
        console.log(`   Total employees: ${count[0].total}`);
        console.log(`   Active: ${count[0].active}`);
        console.log(`   Inactive: ${count[0].inactive}\n`);

        if (count[0].total === 0) {
            console.log('⚠️  No employees found in database!');
            console.log('   You need to add employees first.\n');
            return;
        }

        // 3. Liệt kê nhân viên
        console.log('📋 3. Listing all employees...');
        const [employees] = await connection.query(`
            SELECT 
                ma_nhan_vien,
                ho_ten,
                chuc_vu,
                so_dien_thoai,
                email,
                trang_thai,
                ngay_vao_lam
            FROM nhan_vien
            ORDER BY ma_nhan_vien ASC
        `);

        console.log('\n┌─────┬────────────────────────┬────────────────┬──────────────┬──────────┐');
        console.log('│ ID  │ Họ tên                 │ Chức vụ        │ Điện thoại   │ Trạng thái│');
        console.log('├─────┼────────────────────────┼────────────────┼──────────────┼──────────┤');
        
        employees.forEach(emp => {
            const id = String(emp.ma_nhan_vien).padEnd(4);
            const name = (emp.ho_ten || '').substring(0, 22).padEnd(23);
            const role = (emp.chuc_vu || '').substring(0, 14).padEnd(15);
            const phone = (emp.so_dien_thoai || 'N/A').substring(0, 12).padEnd(13);
            const status = emp.trang_thai === 1 ? '✅ Active' : '❌ Inactive';
            
            console.log(`│ ${id}│ ${name}│ ${role}│ ${phone}│ ${status.padEnd(9)}│`);
        });
        
        console.log('└─────┴────────────────────────┴────────────────┴──────────────┴──────────┘\n');

        // 4. Kiểm tra cấu trúc bảng
        console.log('📋 4. Table structure...');
        const [columns] = await connection.query(`
            DESCRIBE nhan_vien
        `);
        
        console.log('   Columns:', columns.map(c => c.Field).join(', '));
        console.log('');

        // 5. Test URL
        console.log('📋 5. Test URLs for permissions...');
        if (employees.length > 0) {
            console.log('   You can test with these URLs:\n');
            employees.slice(0, 3).forEach(emp => {
                console.log(`   👤 ${emp.ho_ten}:`);
                console.log(`      http://localhost:3001/admin/pages/permissions.html?id=${emp.ma_nhan_vien}\n`);
            });
        }

        console.log('✅ Check completed!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

checkEmployees();
