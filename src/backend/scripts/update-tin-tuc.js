// Script cập nhật bảng tin_tuc
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateTinTucTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'CSDL_DoAnCN'
    });

    console.log('🔄 Đang cập nhật bảng tin_tuc...\n');

    try {
        // Kiểm tra cấu trúc hiện tại
        const [columns] = await connection.query('DESCRIBE tin_tuc');
        const columnNames = columns.map(c => c.Field);
        console.log('📋 Các cột hiện có:', columnNames.join(', '));

        // Đổi tên cột ma_tin thành ma_tin_tuc nếu cần
        if (columnNames.includes('ma_tin') && !columnNames.includes('ma_tin_tuc')) {
            console.log('🔧 Đổi tên cột ma_tin -> ma_tin_tuc...');
            await connection.query('ALTER TABLE tin_tuc CHANGE COLUMN ma_tin ma_tin_tuc INT NOT NULL AUTO_INCREMENT');
        }

        // Đổi tên anh_dai_dien thành hinh_anh nếu cần
        if (columnNames.includes('anh_dai_dien') && !columnNames.includes('hinh_anh')) {
            console.log('🔧 Đổi tên cột anh_dai_dien -> hinh_anh...');
            await connection.query('ALTER TABLE tin_tuc CHANGE COLUMN anh_dai_dien hinh_anh VARCHAR(500) DEFAULT NULL');
        }

        // Đổi tên ngay_dang thành ngay_tao nếu cần
        if (columnNames.includes('ngay_dang') && !columnNames.includes('ngay_tao')) {
            console.log('🔧 Đổi tên cột ngay_dang -> ngay_tao...');
            await connection.query('ALTER TABLE tin_tuc CHANGE COLUMN ngay_dang ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        }

        // Refresh column list
        const [newColumns] = await connection.query('DESCRIBE tin_tuc');
        const newColumnNames = newColumns.map(c => c.Field);

        // Thêm các cột mới nếu chưa có
        const columnsToAdd = [
            { name: 'mo_ta_ngan', sql: 'ADD COLUMN mo_ta_ngan VARCHAR(1000) AFTER tieu_de' },
            { name: 'danh_muc', sql: "ADD COLUMN danh_muc VARCHAR(100) DEFAULT 'Công nghệ'" },
            { name: 'tag', sql: "ADD COLUMN tag VARCHAR(50) DEFAULT 'Tin tức'" },
            { name: 'mau_tag', sql: "ADD COLUMN mau_tag VARCHAR(50) DEFAULT 'blue'" },
            { name: 'luot_xem', sql: 'ADD COLUMN luot_xem INT DEFAULT 0' },
            { name: 'noi_bat', sql: 'ADD COLUMN noi_bat TINYINT(1) DEFAULT 0' },
            { name: 'ngay_cap_nhat', sql: 'ADD COLUMN ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
            { name: 'ma_tai_khoan', sql: 'ADD COLUMN ma_tai_khoan INT' }
        ];

        for (const col of columnsToAdd) {
            if (!newColumnNames.includes(col.name)) {
                console.log(`➕ Thêm cột ${col.name}...`);
                try {
                    await connection.query(`ALTER TABLE tin_tuc ${col.sql}`);
                } catch (e) {
                    console.log(`   ⚠️ Lỗi thêm cột ${col.name}: ${e.message}`);
                }
            }
        }

        // Cập nhật dữ liệu mẫu hiện có
        console.log('\n📝 Cập nhật dữ liệu mẫu...');
        await connection.query(`
            UPDATE tin_tuc SET 
                mo_ta_ngan = COALESCE(mo_ta_ngan, LEFT(noi_dung, 200)),
                danh_muc = COALESCE(danh_muc, 'Công nghệ'),
                tag = COALESCE(tag, 'Tin tức'),
                mau_tag = COALESCE(mau_tag, 'blue'),
                luot_xem = COALESCE(luot_xem, FLOOR(RAND() * 1000)),
                noi_bat = COALESCE(noi_bat, 0)
        `);

        // Kiểm tra số lượng tin tức
        const [countResult] = await connection.query('SELECT COUNT(*) as total FROM tin_tuc');
        console.log(`\n📊 Hiện có ${countResult[0].total} tin tức trong database`);

        // Thêm tin tức mẫu nếu ít hơn 5
        if (countResult[0].total < 5) {
            console.log('\n➕ Thêm tin tức mẫu...');
            const sampleNews = [
                ['iPhone 16 Pro Max: Đánh giá chi tiết sau 1 tháng sử dụng', 'Trải nghiệm thực tế iPhone 16 Pro Max với chip A18 Pro, camera 48MP và nhiều tính năng AI mới...', 'Nội dung chi tiết về iPhone 16 Pro Max...', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=500&fit=crop', 'Điện thoại', 'HOT', 'red', 1, 'hien_thi'],
                ['Top 5 Laptop Gaming đáng mua nhất cuối năm 2024', 'Tổng hợp những laptop gaming tốt nhất với hiệu năng mạnh mẽ và giá cả hợp lý...', 'Nội dung chi tiết về laptop gaming...', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=300&h=200&fit=crop', 'Laptop', 'MỚI', 'green', 1, 'hien_thi'],
                ['Apple Watch Series 10: Màn hình lớn hơn, pin tốt hơn', 'Apple Watch Series 10 với nhiều cải tiến đáng giá về màn hình và thời lượng pin...', 'Nội dung chi tiết về Apple Watch...', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&h=200&fit=crop', 'Phụ kiện', 'REVIEW', 'blue', 1, 'hien_thi'],
                ['AI trong smartphone 2025: Xu hướng không thể bỏ qua', 'Trí tuệ nhân tạo đang thay đổi cách chúng ta sử dụng điện thoại thông minh...', 'Nội dung chi tiết về AI smartphone...', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop', 'Công nghệ', 'TRENDING', 'purple', 1, 'hien_thi'],
                ['Samsung Galaxy S25 lộ diện với thiết kế mới', 'Samsung Galaxy S25 series sẽ có thiết kế hoàn toàn mới với viền mỏng hơn...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&h=250&fit=crop', 'Điện thoại', 'Tin mới', 'red', 0, 'hien_thi'],
                ['MacBook Pro M4 chính thức ra mắt tại Việt Nam', 'Apple MacBook Pro với chip M4 mang đến hiệu năng vượt trội cho người dùng chuyên nghiệp...', 'Nội dung chi tiết...', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=250&fit=crop', 'Laptop', 'Tin mới', 'blue', 0, 'hien_thi']
            ];

            for (const news of sampleNews) {
                try {
                    await connection.query(`
                        INSERT INTO tin_tuc (tieu_de, mo_ta_ngan, noi_dung, hinh_anh, danh_muc, tag, mau_tag, noi_bat, trang_thai)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, news);
                } catch (e) {
                    // Ignore duplicate errors
                }
            }
        }

        // Hiển thị cấu trúc mới
        const [finalColumns] = await connection.query('DESCRIBE tin_tuc');
        console.log('\n✅ Cấu trúc bảng tin_tuc sau khi cập nhật:');
        finalColumns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });

        // Đếm lại
        const [finalCount] = await connection.query('SELECT COUNT(*) as total FROM tin_tuc');
        console.log(`\n🎉 Hoàn tất! Tổng số tin tức: ${finalCount[0].total}`);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await connection.end();
    }
}

updateTinTucTable();
