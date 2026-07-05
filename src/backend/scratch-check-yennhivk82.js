const db = require('./config/database');

(async () => {
    try {
        const email = 'yennhivk82@gmail.com';
        
        console.log(`=== CHECKING ACCOUNT DETAILS FOR ${email} ===`);
        
        // 1. Check in tai_khoan table
        const [users] = await db.query('SELECT * FROM tai_khoan WHERE email = ?', [email]);
        if (users.length === 0) {
            console.log('Account not found in tai_khoan table.');
            process.exit(0);
        }
        
        const user = users[0];
        console.log('User Account:', {
            ma_tai_khoan: user.ma_tai_khoan,
            ten_dang_nhap: user.ten_dang_nhap,
            email: user.email,
            vai_tro: user.vai_tro,
            trang_thai: user.trang_thai
        });
        
        // 2. Check in user_interactions table for preference
        const [interactions] = await db.query(
            'SELECT * FROM user_interactions WHERE MaND = ?',
            [user.ma_tai_khoan]
        );
        console.log(`\nInteractions found (${interactions.length}):`);
        interactions.forEach(i => {
            console.log(`- Product ${i.MaSP}: ${i.LoaiTuongTac} (Value: ${i.GiaTri}, Time: ${i.ThoiGian})`);
        });

        // 3. Check survey preference in cau_hinh_goi_y or similar tables if any
        // Let's see what tables we have for personalized preference/survey
        const [survey] = await db.query(
            'SELECT * FROM cau_hinh_goi_y WHERE ma_tai_khoan = ?',
            [user.ma_tai_khoan]
        );
        console.log(`\nSurvey configs found (${survey.length}):`);
        survey.forEach(s => {
            console.log(s);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
