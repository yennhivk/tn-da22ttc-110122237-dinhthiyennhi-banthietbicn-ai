const db = require('./config/database');

(async () => {
    try {
        const email = 'yennhivk82@gmail.com';
        
        console.log(`=== CHECKING PERSONALIZATION INFO FOR ${email} ===`);
        
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
        
        // 2. Check in thong_tin_ca_nhan_hoa table
        const [personalization] = await db.query(
            'SELECT * FROM thong_tin_ca_nhan_hoa WHERE ma_tai_khoan = ?',
            [user.ma_tai_khoan]
        );
        console.log(`\nPersonalization config found in thong_tin_ca_nhan_hoa (${personalization.length}):`);
        personalization.forEach(p => {
            console.log(p);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
