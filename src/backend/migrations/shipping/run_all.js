/**
 * Shipping migration runner
 * Chạy: node backend/migrations/shipping/run_all.js
 *
 * Đọc tuần tự các file .sql trong thư mục này theo thứ tự tên file
 * và execute từng statement vào DB hiện hành.
 */

const fs = require('fs');
const path = require('path');
const db = require('../../config/database');

const FILES_ORDER = [
    '001_drop_legacy.sql',
    '002_shipping_region_mappings.sql',
    '003_shipping_provinces.sql',
    '004_shipping_zones.sql',
    '005_shipping_zone_rules.sql',
    '006_shipping_fee_logs.sql',
    '007_seed.sql',
    '009_create_shipping_discounts.sql',
    '010_update_realistic_zones.sql'
];

function splitStatements(sql) {
    // Bỏ block comment /* ... */
    let s = sql.replace(/\/\*[\s\S]*?\*\//g, '');
    // Bỏ dòng comment "-- ..."
    s = s.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
    return s.split(';').map(x => x.trim()).filter(Boolean);
}

async function runFile(file) {
    const fullPath = path.join(__dirname, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    const statements = splitStatements(sql);
    console.log(`\n[migration] ▶ ${file}  (${statements.length} statements)`);
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
            await db.query(stmt);
        } catch (err) {
            console.error(`[migration] ✖ ${file} stmt#${i + 1} failed:`, err.message);
            console.error('   SQL:', stmt.substring(0, 200) + (stmt.length > 200 ? '...' : ''));
            throw err;
        }
    }
    console.log(`[migration] ✔ ${file}`);
}

(async () => {
    try {
        console.log('==============================================');
        console.log('  Shipping Engine V3 — Migration Runner');
        console.log('==============================================');
        for (const file of FILES_ORDER) {
            await runFile(file);
        }
        console.log('\n✅ All shipping migrations executed.');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Migration aborted:', err.message);
        process.exit(1);
    }
})();
