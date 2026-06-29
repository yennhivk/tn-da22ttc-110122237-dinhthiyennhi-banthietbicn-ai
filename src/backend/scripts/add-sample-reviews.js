const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSampleReviews() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    try {
        // Kiểm tra đánh giá hiện có
        const [existing] = await conn.query('SELECT COUNT(*) as count FROM danh_gia');
        console.log('Số đánh giá hiện có:', existing[0].count);
        
        // Lấy danh sách sản phẩm và tài khoản
        const [products] = await conn.query('SELECT ma_san_pham FROM san_pham LIMIT 6');
        const [users] = await conn.query("SELECT ma_tai_khoan FROM tai_khoan WHERE vai_tro = 'khach_hang' LIMIT 3");
        
        if (users.length === 0) {
            // Nếu không có khách hàng, lấy bất kỳ tài khoản nào
            const [allUsers] = await conn.query('SELECT ma_tai_khoan FROM tai_khoan LIMIT 3');
            users.push(...allUsers);
        }
        
        if (users.length === 0) {
            console.log('Không có tài khoản nào trong database');
            return;
        }
        
        // Đánh giá mẫu
        const reviews = [
            { so_sao: 5, noi_dung: 'Sản phẩm tuyệt vời, đóng gói cẩn thận, giao hàng nhanh. Rất hài lòng!' },
            { so_sao: 4, noi_dung: 'Chất lượng tốt, giá cả hợp lý. Sẽ ủng hộ shop lần sau.' },
            { so_sao: 5, noi_dung: 'Mình đã mua nhiều lần, lần nào cũng hài lòng. Recommend cho mọi người!' },
            { so_sao: 3, noi_dung: 'Sản phẩm ổn, nhưng giao hàng hơi chậm một chút.' },
            { so_sao: 5, noi_dung: 'Xuất sắc! Đúng như mô tả, hiệu năng mượt mà.' },
            { so_sao: 4, noi_dung: 'Máy đẹp, chạy mượt. Nhân viên tư vấn nhiệt tình.' },
            { so_sao: 5, noi_dung: 'Giá tốt nhất thị trường, bảo hành chu đáo. 10 điểm!' }
        ];
        
        let added = 0;
        for (const product of products) {
            for (let i = 0; i < Math.min(2, users.length); i++) {
                const review = reviews[Math.floor(Math.random() * reviews.length)];
                try {
                    // Kiểm tra xem đã có đánh giá chưa
                    const [check] = await conn.query(
                        'SELECT ma_danh_gia FROM danh_gia WHERE ma_san_pham = ? AND ma_tai_khoan = ?',
                        [product.ma_san_pham, users[i].ma_tai_khoan]
                    );
                    
                    if (check.length === 0) {
                        await conn.query(
                            'INSERT INTO danh_gia (ma_san_pham, ma_tai_khoan, so_sao, noi_dung, trang_thai) VALUES (?, ?, ?, ?, 1)',
                            [product.ma_san_pham, users[i].ma_tai_khoan, review.so_sao, review.noi_dung]
                        );
                        added++;
                        console.log(`+ Đánh giá cho sản phẩm ${product.ma_san_pham}: ${review.so_sao} sao`);
                    }
                } catch (e) {
                    console.log('Lỗi:', e.message);
                }
            }
        }
        
        console.log('\n✅ Đã thêm', added, 'đánh giá mẫu');
        
        // Kiểm tra lại
        const [final] = await conn.query('SELECT COUNT(*) as count FROM danh_gia');
        console.log('📊 Tổng số đánh giá:', final[0].count);
        
    } finally {
        await conn.end();
    }
}

addSampleReviews();
