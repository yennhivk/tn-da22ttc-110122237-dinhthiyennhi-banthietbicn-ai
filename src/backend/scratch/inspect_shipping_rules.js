const db = require('../config/database');

async function inspectRules() {
    try {
        console.log('--- SHIPPING ZONES ---');
        const [zones] = await db.query('SELECT * FROM shipping_zones');
        console.table(zones);

        console.log('\n--- SHIPPING ZONE RULES ---');
        const [rules] = await db.query('SELECT * FROM shipping_zone_rules');
        console.table(rules);
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit();
}

inspectRules();
