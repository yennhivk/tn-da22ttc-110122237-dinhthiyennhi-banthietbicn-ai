const db = require('./config/database');

async function checkNgayTao() {
    try {
        console.log('💡 Checking san_pham table columns...');
        const [cols] = await db.query("DESCRIBE san_pham");
        for (const c of cols) {
            console.log(`- Column: ${c.Field} (${c.Type}) | Null: ${c.Null} | Default: ${c.Default}`);
        }
        
        console.log('\n💡 Selecting latest 10 products sorted by ma_san_pham DESC...');
        const [products] = await db.query("SELECT ma_san_pham, ten_san_pham, ngay_tao FROM san_pham ORDER BY ma_san_pham DESC LIMIT 10");
        for (const p of products) {
            console.log(`- ID: ${p.ma_san_pham} | Name: ${p.ten_san_pham} | ngay_tao: ${p.ngay_tao}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        db.end();
    }
}

checkNgayTao();
