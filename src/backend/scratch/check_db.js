const db = require('../config/database');

async function main() {
    try {
        const [tables] = await db.query('SHOW TABLES');
        console.log('Tables in database:', tables.map(r => Object.values(r)[0]));
        
        // Check if shipping_discounts or similar exists
        for (const t of ['shipping_discounts', 'giam_gia_phi_ship', 'phi_dac_biet', 'shipping_zones', 'shipping_zone_rules']) {
            try {
                const [rows] = await db.query(`SELECT COUNT(*) as count FROM ${t}`);
                console.log(`Table ${t}: ${rows[0].count} rows`);
            } catch (err) {
                console.log(`Table ${t} does not exist or error: ${err.message}`);
            }
        }
        
        // Show shipping discounts if any
        try {
            const [discounts] = await db.query('SELECT * FROM shipping_discounts');
            console.log('shipping_discounts content:', discounts);
        } catch (err) {}

        try {
            const [zones] = await db.query('SELECT id, zone_code, zone_name, zone_type FROM shipping_zones');
            console.log('shipping_zones:', zones);
        } catch (err) {}

        try {
            const [rules] = await db.query('SELECT id, zone_id, rule_name, fixed_fee, province_codes, region_code FROM shipping_zone_rules');
            console.log('shipping_zone_rules:', rules);
        } catch (err) {}
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit();
}

main();
