/**
 * Script tạo nhân viên mẫu
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const sampleEmployees = [
    {
        ho_ten: 'Nguyễn Văn An',
        so_dien_thoai: '0901234567',
        email: 'nguyenvanan@yennhi.vn',
        chuc_vu: 'Quản lý',
        ngay_vao_lam: '2024-01-15',
        luong_co_ban: 15000000,
        trang_thai: 1,
        ghi_chu: 'Quản lý cửa hàng'
    },
    {
        ho_ten: 'Trần Thị Bình',
        so_dien_thoai: '0902345678',
        email: 'tranthibinh@yennhi.vn',
        chuc_vu: 'Nhân viên bán hàng',
        ngay_vao_lam: '2024-02-01',
        luong_co_ban: 8000000,
        trang_thai: 1,
        ghi_chu: 'Nhân viên tư vấn'
    },
    {
        ho_ten: 'Lê Văn Cường',
        so_dien_thoai: '0903456789',
        email: 'levancuong@yennhi.vn',
        chuc_vu: 'Kỹ thuật viên',
        ngay_vao_lam: '2024-03-10',
        luong_co_ban: 10000000,
        trang_thai: 1,
        ghi_chu: 'Sửa chữa và bảo hành'
    },
    {
        ho_ten: 'Phạm Thị Dung',
        so_dien_thoai: '0904567890',
        email: 'phamthidung@yennhi.vn',
        chuc_vu: 'Kế toán',
        ngay_vao_lam: '2024-01-20',
        luong_co_ban: 9000000,
        trang_thai: 1,
        ghi_chu: 'Quản lý tài chính'
    },
    {
        ho_ten: 'Hoàng Văn Em',
        so_dien_thoai: '0905678901',
        email: 'hoangvanem@yennhi.vn',
        chuc_vu: 'Nhân viên kho',
        ngay_vao_lam: '2024-04-01',
        luong_co_ban: 7000000,
        trang_thai: 1,
        ghi_chu: 'Quản lý kho hàng'
    }
];

async function createSampleEmployees() {
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

        // Kiểm tra xem đã có nhân viên chưa
        const [existing] = await connection.query('SELECT COUNT(*) as count FROM nhan_vien');
        
        if (existing[0].count > 0) {
            console.log(`ℹ️  Database already has ${existing[0].count} employee(s)`);
            console.log('   Do you want to add more sample employees? (y/n)');
            
            // Tự động skip nếu đã có nhân viên
            console.log('   Skipping... (already have employees)\n');
            
            // Hiển thị nhân viên hiện có
            const [employees] = await connection.query(`
                SELECT ma_nhan_vien, ho_ten, chuc_vu 
                FROM nhan_vien 
                ORDER BY ma_nhan_vien 
                LIMIT 5
            `);
            
            console.log('📋 Current employees:');
            employees.forEach(emp => {
                console.log(`   - ID ${emp.ma_nhan_vien}: ${emp.ho_ten} (${emp.chuc_vu})`);
            });
            console.log('');
            return;
        }

        console.log('📝 Creating sample employees...\n');

        for (const emp of sampleEmployees) {
            await connection.query(`
                INSERT INTO nhan_vien 
                (ho_ten, so_dien_thoai, email, chuc_vu, ngay_vao_lam, luong_co_ban, trang_thai, ghi_chu)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                emp.ho_ten,
                emp.so_dien_thoai,
                emp.email,
                emp.chuc_vu,
                emp.ngay_vao_lam,
                emp.luong_co_ban,
                emp.trang_thai,
                emp.ghi_chu
            ]);

            console.log(`✅ Created: ${emp.ho_ten} (${emp.chuc_vu})`);
        }

        console.log('\n✅ Successfully created all sample employees!\n');

        // Hiển thị danh sách
        const [newEmployees] = await connection.query(`
            SELECT ma_nhan_vien, ho_ten, chuc_vu, so_dien_thoai
            FROM nhan_vien
            ORDER BY ma_nhan_vien DESC
            LIMIT ${sampleEmployees.length}
        `);

        console.log('📋 Created employees:');
        console.log('┌─────┬────────────────────────┬────────────────────┬──────────────┐');
        console.log('│ ID  │ Họ tên                 │ Chức vụ            │ Điện thoại   │');
        console.log('├─────┼────────────────────────┼────────────────────┼──────────────┤');
        
        newEmployees.reverse().forEach(emp => {
            const id = String(emp.ma_nhan_vien).padEnd(4);
            const name = emp.ho_ten.substring(0, 22).padEnd(23);
            const role = emp.chuc_vu.substring(0, 18).padEnd(19);
            const phone = (emp.so_dien_thoai || '').substring(0, 12).padEnd(13);
            
            console.log(`│ ${id}│ ${name}│ ${role}│ ${phone}│`);
        });
        
        console.log('└─────┴────────────────────────┴────────────────────┴──────────────┘\n');

        console.log('🎉 Done! You can now:');
        console.log('   1. Open admin panel: http://localhost:3001/admin/pages/admin.html');
        console.log('   2. Go to: Quản lý nhân sự → Nhân viên');
        console.log('   3. Click "🔐 Phân quyền" for any employee\n');

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

createSampleEmployees();
