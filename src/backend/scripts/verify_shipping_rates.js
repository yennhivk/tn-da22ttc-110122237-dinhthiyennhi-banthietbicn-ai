const engine = require('../services/shipping/ShippingFeeEngine');

const TEST_CASES = [
    {
        name: 'Trà Vinh (Store Province)',
        input: { address: 'Phường 2, Trà Vinh', province: 'Trà Vinh' },
        expectedFee: 0,
        expectedZone: 'TRA_VINH_FREE'
    },
    {
        name: 'Vĩnh Long (Neighbor Province)',
        input: { address: 'Phường 1, Vĩnh Long', province: 'Vĩnh Long' },
        expectedFee: 70000,
        expectedZone: 'LAN_CAN_70K'
    },
    {
        name: 'Cần Thơ (Neighbor Province)',
        input: { address: 'Phường 1, Cần Thơ', province: 'Cần Thơ' },
        expectedFee: 70000,
        expectedZone: 'LAN_CAN_70K'
    },
    {
        name: 'Cà Mau (Far West)',
        input: { address: 'Phường 1, Cà Mau', province: 'Cà Mau' },
        expectedFee: 100000,
        expectedZone: 'MIEN_TAY_XA_100K'
    },
    {
        name: 'TP.HCM (Southeast Region)',
        input: { address: 'Quận 1, TP.HCM', province: 'TP. Hồ Chí Minh' },
        expectedFee: 120000,
        expectedZone: 'DONG_NAM_BO_120K'
    },
    {
        name: 'Lâm Đồng (Central Highlands)',
        input: { address: 'Đà Lạt, Lâm Đồng', province: 'Lâm Đồng' },
        expectedFee: 150000,
        expectedZone: 'TAY_NGUYEN_150K'
    },
    {
        name: 'Đà Nẵng (Central Vietnam)',
        input: { address: 'Liên Chiểu, Đà Nẵng', province: 'Đà Nẵng' },
        expectedFee: 180000,
        expectedZone: 'MIEN_TRUNG_180K'
    },
    {
        name: 'Hà Nội (Northern Vietnam)',
        input: { address: 'Hoàn Kiếm, Hà Nội', province: 'Hà Nội' },
        expectedFee: 220000,
        expectedZone: 'MIEN_BAC_220K'
    },
    {
        name: 'Vĩnh Long (Address only, no province param)',
        input: { address: 'Xã Thuận Thới, Huyện Trà Ôn, Tỉnh Vĩnh Long' },
        expectedFee: 70000,
        expectedZone: 'LAN_CAN_70K'
    }
];

async function run() {
    console.log('=== VERIFYING SHIPPING RATES ===\n');
    let passed = 0;
    
    for (const tc of TEST_CASES) {
        try {
            const result = await engine.calculate({
                destination: tc.input,
                weight: 1.0,
                order_value: 100000, // less than 500k to avoid order discounts
                preview: true
            });

            if (!result.success) {
                console.error(`❌ [FAIL] ${tc.name}: Calculation failed - ${result.error?.message}`);
                continue;
            }

            const fee = result.shipping_fee;
            const zoneCode = result.match.zone_code;

            const feeOk = fee === tc.expectedFee;
            const zoneOk = zoneCode === tc.expectedZone;

            if (feeOk && zoneOk) {
                console.log(`✅ [PASS] ${tc.name}`);
                console.log(`   Zone matched: ${zoneCode} (Expected: ${tc.expectedZone})`);
                console.log(`   Calculated Fee: ${fee.toLocaleString('vi-VN')}đ (Expected: ${tc.expectedFee.toLocaleString('vi-VN')}đ)`);
                passed++;
            } else {
                console.error(`❌ [FAIL] ${tc.name}`);
                if (!zoneOk) console.error(`   Zone matched: ${zoneCode} (Expected: ${tc.expectedZone})`);
                if (!feeOk) console.error(`   Calculated Fee: ${fee.toLocaleString('vi-VN')}đ (Expected: ${tc.expectedFee.toLocaleString('vi-VN')}đ)`);
            }
        } catch (err) {
            console.error(`❌ [ERROR] ${tc.name}: Exception thrown -`, err.message);
        }
        console.log('--------------------------------------------------');
    }

    console.log(`\nVerification Result: ${passed}/${TEST_CASES.length} test cases passed.`);
    process.exit(passed === TEST_CASES.length ? 0 : 1);
}

run();
