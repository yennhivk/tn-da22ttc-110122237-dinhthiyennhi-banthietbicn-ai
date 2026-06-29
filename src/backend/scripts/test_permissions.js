/**
 * Script test hệ thống phân quyền
 * Chạy: node scripts/test_permissions.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testPermissions() {
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

        // 1. Kiểm tra bảng phan_quyen
        console.log('📋 1. Checking phan_quyen table...');
        const [tables] = await connection.query(`
            SHOW TABLES LIKE 'phan_quyen'
        `);
        
        if (tables.length === 0) {
            console.log('❌ Table phan_quyen does not exist!');
            console.log('   Run: node scripts/run_permissions_migration.js');
            return;
        }
        console.log('✅ Table phan_quyen exists\n');

        // 2. Kiểm tra cấu trúc bảng
        console.log('📋 2. Checking table structure...');
        const [columns] = await connection.query(`
            DESCRIBE phan_quyen
        `);
        console.log('   Columns:', columns.map(c => c.Field).join(', '));
        console.log('✅ Table structure OK\n');

        // 3. Kiểm tra nhân viên
        console.log('📋 3. Checking employees...');
        const [employees] = await connection.query(`
            SELECT ma_nhan_vien, ho_ten, chuc_vu, trang_thai 
            FROM nhan_vien 
            WHERE trang_thai = 1 
            LIMIT 5
        `);
        
        if (employees.length === 0) {
            console.log('⚠️  No active employees found');
            console.log('   Add employees first to test permissions\n');
            return;
        }

        console.log(`✅ Found ${employees.length} active employee(s):`);
        employees.forEach(emp => {
            console.log(`   - ${emp.ho_ten} (ID: ${emp.ma_nhan_vien}, Role: ${emp.chuc_vu})`);
        });
        console.log('');

        // 4. Kiểm tra phân quyền hiện có
        console.log('📋 4. Checking existing permissions...');
        const [permissions] = await connection.query(`
            SELECT pq.ma_phan_quyen, pq.ma_nhan_vien, nv.ho_ten, pq.nguoi_cap_nhat, pq.ngay_cap_nhat
            FROM phan_quyen pq
            JOIN nhan_vien nv ON pq.ma_nhan_vien = nv.ma_nhan_vien
        `);

        if (permissions.length === 0) {
            console.log('⚠️  No permissions configured yet');
            console.log('   Use the admin UI to configure permissions\n');
        } else {
            console.log(`✅ Found ${permissions.length} permission record(s):`);
            permissions.forEach(perm => {
                console.log(`   - ${perm.ho_ten} (ID: ${perm.ma_nhan_vien})`);
                console.log(`     Updated by: ${perm.nguoi_cap_nhat || 'N/A'}`);
                console.log(`     Updated at: ${perm.ngay_cap_nhat || 'N/A'}`);
            });
            console.log('');
        }

        // 5. Test thêm phân quyền mẫu cho nhân viên đầu tiên
        if (employees.length > 0 && permissions.length === 0) {
            console.log('📋 5. Creating sample permission for first employee...');
            const firstEmployee = employees[0];
            
            const samplePermissions = {
                view_orders: true,
                create_orders: true,
                view_products: true,
                view_customers: true,
                view_reports: false,
                edit_settings: false
            };

            await connection.query(`
                INSERT INTO phan_quyen (ma_nhan_vien, quyen, nguoi_cap_nhat)
                VALUES (?, ?, ?)
            `, [
                firstEmployee.ma_nhan_vien,
                JSON.stringify(samplePermissions),
                'system_test'
            ]);

            console.log(`✅ Created sample permissions for ${firstEmployee.ho_ten}`);
            console.log('   Permissions:', Object.keys(samplePermissions).filter(k => samplePermissions[k]).join(', '));
            console.log('');
        }

        // 6. Kiểm tra log hoạt động
        console.log('📋 6. Checking activity log table...');
        const [logTables] = await connection.query(`
            SHOW TABLES LIKE 'log_hoat_dong'
        `);
        
        if (logTables.length === 0) {
            console.log('❌ Table log_hoat_dong does not exist!');
            console.log('   Run: node scripts/run_permissions_migration.js');
        } else {
            console.log('✅ Table log_hoat_dong exists');
            
            const [logCount] = await connection.query(`
                SELECT COUNT(*) as count FROM log_hoat_dong
            `);
            console.log(`   Log entries: ${logCount[0].count}`);
        }
        console.log('');

        // 7. Test query phân quyền
        console.log('📋 7. Testing permission query...');
        const [testQuery] = await connection.query(`
            SELECT 
                nv.ma_nhan_vien,
                nv.ho_ten,
                nv.chuc_vu,
                pq.quyen
            FROM nhan_vien nv
            LEFT JOIN phan_quyen pq ON nv.ma_nhan_vien = pq.ma_nhan_vien
            WHERE nv.trang_thai = 1
            LIMIT 3
        `);

        console.log('✅ Query successful. Sample results:');
        testQuery.forEach(row => {
            console.log(`   - ${row.ho_ten} (${row.chuc_vu})`);
            if (row.quyen) {
                const perms = typeof row.quyen === 'string' ? JSON.parse(row.quyen) : row.quyen;
                const activePerms = Object.keys(perms).filter(k => perms[k]);
                console.log(`     Active permissions: ${activePerms.length}`);
            } else {
                console.log('     No permissions configured');
            }
        });
        console.log('');

        // 8. Tổng kết
        console.log('=' .repeat(50));
        console.log('🎉 PERMISSION SYSTEM TEST COMPLETED');
        console.log('=' .repeat(50));
        console.log('');
        console.log('✅ Database tables: OK');
        console.log(`✅ Active employees: ${employees.length}`);
        console.log(`✅ Configured permissions: ${permissions.length}`);
        console.log('');
        console.log('📝 Next steps:');
        console.log('   1. Open admin panel: http://localhost:3001/admin/pages/admin.html');
        console.log('   2. Go to: Quản lý nhân sự → Nhân viên');
        console.log('   3. Click "🔐 Phân quyền" button for any employee');
        console.log('   4. Configure permissions and save');
        console.log('');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

testPermissions();
