const db = require('../config/database');

async function test() {
    try {
        console.log('Testing database query identical to /suppliers/list...');
        let query = 'SELECT * FROM nha_cung_cap WHERE 1=1';
        const params = [];
        const [suppliers] = await db.query(query, params);
        console.log('✅ Query SUCCESS! Result count:', suppliers.length);
        console.log('Data:', suppliers);
    } catch (e) {
        console.error('❌ Query ERROR:', e.message);
    }
    process.exit(0);
}

test();
