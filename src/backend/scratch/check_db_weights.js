const db = require('../config/database');

async function check() {
    try {
        const [products] = await db.query('SELECT ma_san_pham, ten_san_pham, trong_luong_kg FROM san_pham WHERE trong_luong_kg > 0.5 LIMIT 10');
        console.log('Products with weight > 0.5kg:');
        console.log(products);
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit();
}

check();
