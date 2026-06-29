const db = require('../config/database');

async function check() {
    try {
        const email = 'dinhthiyennhitv84@gmail.com';
        const [users] = await db.query('SELECT ma_tai_khoan, email FROM tai_khoan WHERE email = ?', [email]);
        console.log('User with email', email, ':');
        console.log(users);
        
        // Thử tạo thông báo test
        if (users.length > 0) {
            const [result] = await db.query(`
                INSERT INTO thong_bao (ma_tai_khoan, loai_thong_bao, tieu_de, noi_dung, duong_dan, da_doc)
                VALUES (?, 'system', ?, ?, ?, 0)
            `, [users[0].ma_tai_khoan, 'Test phản hồi liên hệ', 'Đây là nội dung phản hồi test', 'notifications.html']);
            console.log('Created test notification, ID:', result.insertId);
        } else {
            console.log('User not found!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

check();
