const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createHrTables() {
    let connection;
    
    try {
        console.log('🔍 Connecting to database for HR Tables creation...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'CSDL_DoAnCN',
            charset: 'utf8mb4'
        });

        console.log('✅ Connected to database successfully!');

        // 1. Tạo bảng ca_lam_viec
        console.log('\n📦 Creating table ca_lam_viec...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS ca_lam_viec (
                ma_ca INT AUTO_INCREMENT PRIMARY KEY,
                ten_ca VARCHAR(100) NOT NULL,
                gio_bat_dau TIME NOT NULL,
                gio_ket_thuc TIME NOT NULL,
                he_so_luong DECIMAL(3,2) DEFAULT 1.00,
                ghi_chu TEXT,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Table ca_lam_viec created!');

        // 2. Tạo bảng cham_cong
        console.log('\n📦 Creating table cham_cong...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS cham_cong (
                ma_cham_cong INT AUTO_INCREMENT PRIMARY KEY,
                ma_nhan_vien INT NOT NULL,
                ngay DATE NOT NULL,
                ma_ca INT NOT NULL,
                gio_vao TIME NULL,
                gio_ra TIME NULL,
                trang_thai ENUM('dung_gio', 'di_muon', 've_som', 'nghi_co_phep', 'nghi_khong_phep') DEFAULT 'dung_gio',
                ghi_chu TEXT,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien(ma_nhan_vien) ON DELETE CASCADE,
                FOREIGN KEY (ma_ca) REFERENCES ca_lam_viec(ma_ca) ON DELETE CASCADE,
                UNIQUE KEY uq_nv_ngay_ca (ma_nhan_vien, ngay, ma_ca)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Table cham_cong created!');

        // 3. Tạo bảng bang_luong
        console.log('\n📦 Creating table bang_luong...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS bang_luong (
                ma_bang_luong INT AUTO_INCREMENT PRIMARY KEY,
                ma_nhan_vien INT NOT NULL,
                thang TINYINT NOT NULL,
                nam INT NOT NULL,
                so_ngay_cong DECIMAL(5,2) DEFAULT 0.00,
                phu_cap DECIMAL(15,2) DEFAULT 0.00,
                thuong DECIMAL(15,2) DEFAULT 0.00,
                khau_tru DECIMAL(15,2) DEFAULT 0.00,
                thuc_linh DECIMAL(15,2) DEFAULT 0.00,
                trang_thai ENUM('chua_thanh_toan', 'da_thanh_toan') DEFAULT 'chua_thanh_toan',
                ngay_thanh_toan DATETIME NULL,
                ghi_chu TEXT,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ma_nhan_vien) REFERENCES nhan_vien(ma_nhan_vien) ON DELETE CASCADE,
                UNIQUE KEY uq_nv_thang_nam (ma_nhan_vien, thang, nam)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Table bang_luong created!');

        // Kiểm tra xem đã có dữ liệu mẫu của Shifts chưa
        const [existingShifts] = await connection.query('SELECT COUNT(*) as count FROM ca_lam_viec');
        
        if (existingShifts[0].count === 0) {
            console.log('\n📝 Seeding sample data for Shifts...');
            await connection.query(`
                INSERT INTO ca_lam_viec (ten_ca, gio_bat_dau, gio_ket_thuc, he_so_luong, ghi_chu)
                VALUES
                ('Ca Sáng', '08:00:00', '12:00:00', 1.00, 'Ca làm việc buổi sáng'),
                ('Ca Chiều', '13:30:00', '17:30:00', 1.00, 'Ca làm việc buổi chiều'),
                ('Ca Tối', '18:00:00', '22:00:00', 1.20, 'Ca tối (phụ cấp 20%)')
            `);
            console.log('✅ Seeded 3 work shifts!');
        }

        // Kiểm tra xem đã có dữ liệu mẫu của Attendance chưa
        const [existingAttendance] = await connection.query('SELECT COUNT(*) as count FROM cham_cong');
        if (existingAttendance[0].count === 0) {
            console.log('\n📝 Seeding sample data for Attendance...');
            // Lấy 3 nhân viên mẫu: NV1, NV2, NV3
            // Chấm công cho tháng 5 năm 2026 (curDate = 2026-05-17)
            const queryAttendance = `
                INSERT INTO cham_cong (ma_nhan_vien, ngay, ma_ca, gio_vao, gio_ra, trang_thai, ghi_chu)
                VALUES
                (1, '2026-05-15', 1, '07:55:00', '12:05:00', 'dung_gio', 'Vào ra đúng giờ'),
                (1, '2026-05-15', 2, '13:28:00', '17:32:00', 'dung_gio', 'Vào ra đúng giờ'),
                (1, '2026-05-16', 1, '08:15:00', '12:00:00', 'di_muon', 'Đi muộn 15 phút do kẹt xe'),
                (1, '2026-05-16', 2, '13:30:00', '17:30:00', 'dung_gio', 'Vào ra đúng giờ'),
                (2, '2026-05-15', 1, '07:50:00', '12:02:00', 'dung_gio', 'Vào ra đúng giờ'),
                (2, '2026-05-15', 2, '13:20:00', '17:00:00', 've_som', 'Về sớm 30 phút xin phép trước'),
                (3, '2026-05-15', 1, '07:58:00', '12:00:00', 'dung_gio', 'Vào ra đúng giờ'),
                (3, '2026-05-15', 2, '13:30:00', '17:30:00', 'dung_gio', 'Vào ra đúng giờ')
            `;
            await connection.query(queryAttendance);
            console.log('✅ Seeded sample attendance records!');
        }

        // Kiểm tra xem đã có dữ liệu mẫu của Payroll chưa
        const [existingPayroll] = await connection.query('SELECT COUNT(*) as count FROM bang_luong');
        if (existingPayroll[0].count === 0) {
            console.log('\n📝 Seeding sample data for Payroll...');
            // Tạo bảng lương mẫu cho tháng 4/2026
            await connection.query(`
                INSERT INTO bang_luong (ma_nhan_vien, thang, nam, so_ngay_cong, phu_cap, thuong, khau_tru, thuc_linh, trang_thai, ngay_thanh_toan, ghi_chu)
                VALUES
                (1, 4, 2026, 25.00, 500000, 200000, 0, 8700000, 'da_thanh_toan', '2026-05-05 10:00:00', 'Lương tháng 4 đã phát'),
                (2, 4, 2026, 24.50, 500000, 0, 50000, 7513461, 'da_thanh_toan', '2026-05-05 10:05:00', 'Khấu trừ 50k đi muộn'),
                (3, 4, 2026, 26.00, 1000000, 1000000, 0, 14000000, 'da_thanh_toan', '2026-05-05 09:30:00', 'Lương quản lý + thưởng KPI')
            `);
            console.log('✅ Seeded sample payroll records!');
        }

        console.log('\n🎉 HR Tables created and seeded successfully!');
    } catch (error) {
        console.error('\n❌ Error occurred:', error.message);
        console.error(error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed.');
        }
    }
}

createHrTables();
