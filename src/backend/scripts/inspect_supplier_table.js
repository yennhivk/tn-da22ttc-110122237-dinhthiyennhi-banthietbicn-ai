const db = require('../config/database');

async function inspect() {
    try {
        console.log('🔍 Describing table "nha_cung_cap"...');
        const [columns] = await db.query('DESCRIBE nha_cung_cap');
        console.table(columns);
        
        console.log('\n🔍 Fetching records from "nha_cung_cap"...');
        const [rows] = await db.query('SELECT * FROM nha_cung_cap');
        console.log(`Found ${rows.length} records:`);
        console.log(rows);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during database inspection:', err.message);
        console.log('💡 Trying to check if the table exists or needs creation...');
        process.exit(1);
    }
}

inspect();
