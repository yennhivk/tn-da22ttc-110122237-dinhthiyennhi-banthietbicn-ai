const engine = require('../services/shipping/ShippingFeeEngine');
const db = require('../config/database');

async function testScenario(name, destination, weight, orderValue, expected) {
    try {
        console.log(`\n--------------------------------------------------`);
        console.log(`🧪 Running test: ${name}`);
        console.log(`Input - Dest: ${destination.province}, Weight: ${weight}kg, Order Value: ${orderValue.toLocaleString()}đ`);
        
        // Resolve target config
        const response = await engine.calculate({
            destination,
            weight,
            order_value: orderValue,
            preview: true
        });

        if (!response.success) {
            throw new Error('Engine calculation failed: ' + JSON.stringify(response.error));
        }

        const breakdown = response.breakdown;
        
        // Let's compute discount similarly to how shipping-config.js computes it
        const [rows] = await db.query(
            `SELECT discount_percentage, description 
               FROM shipping_discounts 
              WHERE status = 'active' 
                AND order_value_from <= ? 
                AND (order_value_to IS NULL OR order_value_to >= ?)
              ORDER BY discount_percentage DESC, order_value_from DESC
              LIMIT 1`,
            [orderValue, orderValue]
        );
        
        let discountPercent = 0;
        let discountAmount = 0;
        if (rows.length > 0) {
            discountPercent = rows[0].discount_percentage;
            discountAmount = Math.round(response.shipping_fee * (discountPercent / 100));
        }

        const finalFee = Math.max(0, response.shipping_fee - discountAmount);

        console.log(`Result:`);
        console.log(`   - Match Type: ${response.match.type}`);
        console.log(`   - Zone Name: ${response.match.zone_name}`);
        console.log(`   - Base Fee: ${breakdown.base_fee.toLocaleString()}đ`);
        console.log(`   - Insurance Fee: ${breakdown.insurance_fee.toLocaleString()}đ`);
        console.log(`   - Subtotal Fee: ${response.shipping_fee.toLocaleString()}đ`);
        console.log(`   - Discount: ${discountPercent}% (-${discountAmount.toLocaleString()}đ)`);
        console.log(`   - Free Ship Applied: ${response.free_shipping_applied}`);
        console.log(`   - Final Fee: ${finalFee.toLocaleString()}đ (Expected: ${expected.finalFee.toLocaleString()}đ)`);

        // Assertions
        if (finalFee !== expected.finalFee) {
            throw new Error(`Assertion failed: expected final fee to be ${expected.finalFee} but got ${finalFee}`);
        }
        if (response.free_shipping_applied !== expected.freeShippingApplied) {
            throw new Error(`Assertion failed: expected free shipping applied to be ${expected.freeShippingApplied} but got ${response.free_shipping_applied}`);
        }
        if (discountPercent !== expected.discountPercent) {
            throw new Error(`Assertion failed: expected discount percent to be ${expected.discountPercent} but got ${discountPercent}`);
        }

        console.log(`✅ TEST PASSED`);
    } catch (err) {
        console.error(`❌ TEST FAILED: ${err.message}`);
        process.exit(1);
    }
}

async function runTests() {
    // Scenario 1: Order value under 500k -> 0% discount. Base fee should be 35k for TP.HCM.
    await testScenario(
        "Order under 500k (no discount)",
        { province: "TP. Hồ Chí Minh" },
        1,
        300000,
        { finalFee: 35000, freeShippingApplied: false, discountPercent: 0 }
    );

    // Scenario 2: Order value 600k -> 30% discount. Base fee 35k -> final fee 24,500đ.
    await testScenario(
        "Order 600k (30% discount)",
        { province: "TP. Hồ Chí Minh" },
        1,
        600000,
        { finalFee: 24500, freeShippingApplied: false, discountPercent: 30 }
    );

    // Scenario 3: Order value 1.2M -> 50% discount. Base fee 35k + 6k insurance fee = 41k subtotal -> final fee 20,500đ.
    await testScenario(
        "Order 1.2M (50% discount + insurance)",
        { province: "TP. Hồ Chí Minh" },
        1,
        1200000,
        { finalFee: 20500, freeShippingApplied: false, discountPercent: 50 }
    );

    // Scenario 4: Order value >= 2M -> 100% discount / Free shipping.
    await testScenario(
        "Order 2.5M (Free shipping)",
        { province: "TP. Hồ Chí Minh" },
        1,
        2500000,
        { finalFee: 0, freeShippingApplied: true, discountPercent: 100 }
    );

    console.log(`\n🎉 All integration tests passed successfully!`);
    process.exit(0);
}

runTests();
