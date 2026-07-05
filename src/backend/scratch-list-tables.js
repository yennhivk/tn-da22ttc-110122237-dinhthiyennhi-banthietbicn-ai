const db = require('./config/database');

async function checkQuangCao() {
    try {
        console.log('🔌 Describing quang_cao table...');
        const [cols] = await db.query("DESCRIBE `quang_cao`");
        for (const c of cols) {
            console.log(`- Column: ${c.Field} (${c.Type})`);
        }
        
        console.log('🔌 Querying data...');
        const [data] = await db.query("SELECT * FROM `quang_cao`");
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        db.end();
    }
}

checkQuangCao();
