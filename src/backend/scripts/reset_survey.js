const db = require('../config/database');
const RecommendationEngineJS = require('../utils/recommendationEngineJS');

async function resetSurveyData() {
    try {
        console.log('🔄 Bắt đầu dọn dẹp dữ liệu khảo sát và hành vi...');
        
        // 1. Thêm cột muc_dich_su_dung và phan_khuc_ngan_sach vào bảng tai_khoan nếu chưa có
        try {
            await db.query(`ALTER TABLE tai_khoan ADD COLUMN muc_dich_su_dung VARCHAR(255) NULL`);
            console.log('✅ Đã thêm cột muc_dich_su_dung vào bảng tai_khoan');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Cột muc_dich_su_dung đã tồn tại');
            } else {
                console.warn('⚠️ Lỗi thêm cột muc_dich_su_dung:', e.message);
            }
        }
        
        try {
            await db.query(`ALTER TABLE tai_khoan ADD COLUMN phan_khuc_ngan_sach VARCHAR(255) NULL`);
            console.log('✅ Đã thêm cột phan_khuc_ngan_sach vào bảng tai_khoan');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Cột phan_khuc_ngan_sach đã tồn tại');
            } else {
                console.warn('⚠️ Lỗi thêm cột phan_khuc_ngan_sach:', e.message);
            }
        }

        // 2. Setup database bằng code có sẵn trong Engine (tạo bảng user_interactions nếu chưa có)
        await RecommendationEngineJS.setupDatabase();
        console.log('✅ Đã khởi tạo bảng user_interactions (nếu chưa có)');

        // 3. Xóa toàn bộ dữ liệu trong user_interactions (xóa dữ liệu sở thích admin)
        await db.query(`TRUNCATE TABLE user_interactions`);
        console.log('✅ Đã xóa toàn bộ dữ liệu trong bảng user_interactions');

        // 4. Reset muc_dich_su_dung và phan_khuc_ngan_sach của tất cả tài khoản
        await db.query(`UPDATE tai_khoan SET muc_dich_su_dung = NULL, phan_khuc_ngan_sach = NULL`);
        console.log('✅ Đã xóa mục đích sử dụng và phân khúc ngân sách của tất cả tài khoản');

        console.log('🎉 ĐÃ HOÀN TẤT!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
}

resetSurveyData();
