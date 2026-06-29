const db = require('../config/database');

async function update() {
    try {
        console.log('--- BEFORE UPDATE: CURRENT SHIPPING ZONE RULES ---');
        const [rulesBefore] = await db.query('SELECT id, rule_name, weight_limit_kg, extra_per_kg FROM shipping_zone_rules');
        console.log(rulesBefore);

        console.log('\n--- UPDATING WEIGHT LIMIT TO 1.00 KG ---');
        const [updateResult] = await db.query('UPDATE shipping_zone_rules SET weight_limit_kg = 1.00');
        console.log(`Updated ${updateResult.affectedRows} rows.`);

        console.log('\n--- AFTER UPDATE: VERIFYING SHIPPING ZONE RULES ---');
        const [rulesAfter] = await db.query('SELECT id, rule_name, weight_limit_kg, extra_per_kg FROM shipping_zone_rules');
        console.log(rulesAfter);

        // Also check if there are hardcoded defaults in ShippingFeeEngine.js
        console.log('\n--- Note: We will also search if there are other hardcoded defaults in the code. ---');
    } catch (err) {
        console.error('Error updating database weight limit:', err);
    }
    process.exit();
}

update();
