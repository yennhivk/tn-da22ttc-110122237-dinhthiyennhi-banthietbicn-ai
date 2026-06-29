const db = require('../config/database');

async function run() {
    const tables = ['nhan_vien', 'ca_lam_viec', 'cham_cong', 'bang_luong'];
    
    for (const t of tables) {
        console.log(`\n=== STRUCTURE OF ${t} ===`);
        try {
            const [cols] = await db.query(`DESCRIBE ${t}`);
            cols.forEach(c => {
                console.log(`  - ${c.Field}: ${c.Type} (Null: ${c.Null}, Key: ${c.Key}, Default: ${c.Default})`);
            });
        } catch (e) {
            console.log(`  ❌ Error describing table ${t}: ${e.message}`);
        }
    }
    process.exit(0);
}

run();
