const db = require('../config/database');

async function test() {
    try {
        console.log('Testing components query with LEFT JOIN on nha_cung_cap...');
        let query = `
            SELECT lk.*, ncc.ten_nha_cung_cap
            FROM linh_kien lk
            LEFT JOIN nha_cung_cap ncc ON lk.ma_nha_cung_cap = ncc.ma_nha_cung_cap
        `;
        const [rows] = await db.query(query);
        console.log('✅ SQL Query Success! Total items fetched:', rows.length);
        console.log('Sample record:', rows[0]);
    } catch (e) {
        console.error('❌ SQL Query Error:', e.message);
    }
    process.exit(0);
}

test();
