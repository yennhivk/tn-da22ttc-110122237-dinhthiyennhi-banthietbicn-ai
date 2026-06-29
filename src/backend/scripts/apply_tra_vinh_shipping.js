const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const ProvinceMatcher = require('../services/shipping/ProvinceMatcher');
const ZoneResolver = require('../services/shipping/ZoneResolver');

function splitStatements(sql) {
    let s = sql.replace(/\/\*[\s\S]*?\*\//g, '');
    s = s.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
    return s.split(';').map(x => x.trim()).filter(Boolean);
}

async function run() {
    try {
        console.log('=== STARTING TRÀ VINH SHIPPING DATABASE UPDATE ===');

        // 1. Update store details in thong_tin_cua_hang
        console.log('1. Updating default store info to Trà Vinh...');
        await db.query(`
            UPDATE thong_tin_cua_hang
            SET
                dia_chi_day_du = '74-76 Lê Lợi, Phường 2, Trà Vinh',
                tinh_thanh = 'Trà Vinh',
                quan_huyen = 'Thành phố Trà Vinh',
                phuong_xa = 'Phường 2',
                kinh_do = 106.3419,
                vi_do = 9.9347
            WHERE la_mac_dinh = TRUE
        `);
        console.log('✅ Store updated successfully.');

        // 2. Read and run 008_reset_zones_tra_vinh.sql
        console.log('2. Running 008_reset_zones_tra_vinh.sql...');
        const sqlPath = path.join(__dirname, '../migrations/shipping/008_reset_zones_tra_vinh.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        const statements = splitStatements(sqlContent);

        console.log(`Found ${statements.length} SQL statements to execute.`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            try {
                await db.query(stmt);
            } catch (err) {
                console.error(`❌ Statement #${i + 1} failed:`, err.message);
                console.error('SQL:', stmt.substring(0, 200) + (stmt.length > 200 ? '...' : ''));
                throw err;
            }
        }
        console.log('✅ 008_reset_zones_tra_vinh.sql executed successfully.');

        // 3. Invalidate Caches
        console.log('3. Invalidating matcher/resolver caches...');
        ProvinceMatcher.invalidateCache();
        ZoneResolver.invalidateCache();
        console.log('✅ Caches invalidated.');

        console.log('\n🎉 ALL DATABASE UPDATES COMPLETE!');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error during database update:', err.message);
        process.exit(1);
    }
}

run();
