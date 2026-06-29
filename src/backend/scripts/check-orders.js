const db = require('../config/database');

async function checkOrders() {
    try {
        // Check customer growth data
        const [growth] = await db.query(`
            SELECT 
                DATE_FORMAT(ngay_tao, '%Y-%m-%d') as ngay,
                COUNT(*) as so_khach_moi
            FROM tai_khoan
            WHERE vai_tro = 'khach_hang' AND ngay_tao >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE_FORMAT(ngay_tao, '%Y-%m-%d')
            ORDER BY ngay ASC
        `);
        console.log('Customer growth:', growth);

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

checkOrders();
