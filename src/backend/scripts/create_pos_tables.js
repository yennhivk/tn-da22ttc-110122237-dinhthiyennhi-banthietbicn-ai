const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createPosTables() {
    let connection;
    
    try {
        console.log('🔍 Thông tin kết nối:');
        console.log(`   Host: ${process.env.DB_HOST}`);
        console.log(`   User: ${process.env.DB_USER}`);
        console.log(`   Database: ${process.env.DB_NAME}`);
        
        // Kết nối database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'CSDL_DoAnCN',
            charset: 'utf8mb4'
        });

        console.log('✅ Kết nối database thành công!');

        // Tạo bảng may_pos
        console.log('\n📦 Đang tạo bảng may_pos...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS may_pos (
                ma_pos INT AUTO_INCREMENT PRIMARY KEY,
                ma_may VARCHAR(50) NOT NULL UNIQUE,
                ten_may VARCHAR(100) NOT NULL,
                vi_tri VARCHAR(255),
                trang_thai ENUM('active','offline','maintenance') DEFAULT 'active',
                may_in VARCHAR(100),
                cong_may_in VARCHAR(50),
                may_quet VARCHAR(100),
                cong_may_quet VARCHAR(50),
                nhan_vien_ids TEXT,
                ghi_chu TEXT,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Bảng may_pos đã được tạo!');

        // Tạo bảng giao_dich_pos
        console.log('\n📦 Đang tạo bảng giao_dich_pos...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS giao_dich_pos (
                ma_giao_dich INT AUTO_INCREMENT PRIMARY KEY,
                ma_pos INT,
                ma_don_hang INT,
                loai_giao_dich ENUM('thanh_toan','hoan_tien','huy') DEFAULT 'thanh_toan',
                so_tien DECIMAL(15,2) NOT NULL,
                phuong_thuc_thanh_toan ENUM('tien_mat','the','chuyen_khoan','momo','zalopay') DEFAULT 'tien_mat',
                trang_thai ENUM('thanh_cong','that_bai','dang_xu_ly') DEFAULT 'thanh_cong',
                thoi_gian DATETIME DEFAULT CURRENT_TIMESTAMP,
                ma_tham_chieu VARCHAR(100),
                ghi_chu TEXT,
                FOREIGN KEY (ma_pos) REFERENCES may_pos(ma_pos),
                FOREIGN KEY (ma_don_hang) REFERENCES don_hang(ma_don_hang)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Bảng giao_dich_pos đã được tạo!');

        // Kiểm tra xem đã có dữ liệu chưa
        const [existingData] = await connection.query('SELECT COUNT(*) as count FROM may_pos');
        
        if (existingData[0].count === 0) {
            console.log('\n📝 Đang thêm dữ liệu mẫu...');
            
            // Thêm dữ liệu mẫu cho may_pos
            await connection.query(`
                INSERT INTO may_pos (ma_may, ten_may, vi_tri, trang_thai, may_in, cong_may_in, may_quet, cong_may_quet, nhan_vien_ids, ghi_chu)
                VALUES
                ('POS001', 'Máy POS Quầy 1', 'Tầng 1 - Quầy thanh toán chính', 'active', 'HP LaserJet P1102', 'USB001', 'Honeywell 1900', 'USB002', '2,3', 'Máy chính, ưu tiên cao'),
                ('POS002', 'Máy POS Quầy 2', 'Tầng 1 - Quầy phụ kiện', 'active', 'Canon LBP2900', 'USB003', 'Zebra DS2208', 'USB004', '3', 'Quầy phụ kiện điện thoại'),
                ('POS003', 'Máy POS Quầy 3', 'Tầng 2 - Quầy laptop', 'offline', 'Epson TM-T82', 'COM1', 'Datalogic QD2430', 'USB005', '2', 'Đang bảo trì'),
                ('POS004', 'Máy POS Di động', 'Kho hàng', 'maintenance', 'Brother QL-820NWB', 'WiFi', 'Zebra TC21', 'Bluetooth', '4', 'Máy di động cho kho')
            `);
            console.log('✅ Đã thêm 4 máy POS mẫu!');

            // Thêm dữ liệu mẫu cho giao_dich_pos
            await connection.query(`
                INSERT INTO giao_dich_pos (ma_pos, ma_don_hang, loai_giao_dich, so_tien, phuong_thuc_thanh_toan, trang_thai, ma_tham_chieu, ghi_chu)
                VALUES
                (1, 1, 'thanh_toan', 39980000, 'the', 'thanh_cong', 'TXN20251113001', 'Thanh toán thẻ Visa'),
                (2, 2, 'thanh_toan', 5990000, 'tien_mat', 'thanh_cong', 'TXN20251113002', 'Thanh toán tiền mặt'),
                (1, NULL, 'thanh_toan', 1500000, 'momo', 'thanh_cong', 'MOMO20251113003', 'Mua phụ kiện lẻ'),
                (2, NULL, 'thanh_toan', 890000, 'tien_mat', 'thanh_cong', 'TXN20251113004', 'Mua ốp lưng'),
                (1, NULL, 'hoan_tien', 500000, 'tien_mat', 'thanh_cong', 'REF20251113001', 'Hoàn tiền do lỗi sản phẩm')
            `);
            console.log('✅ Đã thêm 5 giao dịch mẫu!');
        } else {
            console.log('\n⚠️  Dữ liệu đã tồn tại, bỏ qua việc thêm dữ liệu mẫu.');
        }

        // Hiển thị thống kê
        const [posCount] = await connection.query('SELECT COUNT(*) as count FROM may_pos');
        const [transCount] = await connection.query('SELECT COUNT(*) as count FROM giao_dich_pos');
        
        console.log('\n📊 Thống kê:');
        console.log(`   - Số máy POS: ${posCount[0].count}`);
        console.log(`   - Số giao dịch: ${transCount[0].count}`);
        
        console.log('\n🎉 Hoàn thành! Các bảng POS đã được tạo thành công!');

    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            console.log('💡 Dữ liệu đã tồn tại, không cần thêm lại.');
        } else {
            console.error('💡 Chi tiết lỗi:', error);
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Đã đóng kết nối database.');
        }
    }
}

// Chạy script
createPosTables();
