const db = require('./config/database');

async function seedZones() {
    try {
        // 1. Xóa dữ liệu cũ
        console.log('🗑️ Deleting old data...');
        await db.query('DELETE FROM shipping_zone_rules');
        await db.query('DELETE FROM shipping_zones');
        await db.query('ALTER TABLE shipping_zones AUTO_INCREMENT = 1');
        await db.query('ALTER TABLE shipping_zone_rules AUTO_INCREMENT = 1');
        
        // 2. Insert zones
        console.log('📦 Creating zones...');
        await db.query(`
            INSERT INTO shipping_zones (zone_code, zone_name, zone_type, priority, description, status) VALUES
            ('TRA_VINH_FREE', 'Trà Vinh — Miễn phí ship', 'province', 100, 'Toàn bộ Trà Vinh', 'active'),
            ('LAN_CAN_70K', 'Tỉnh lân cận — 70.000đ', 'province', 95, 'Vĩnh Long, Bến Tre, Sóc Trăng, Cần Thơ, Tiền Giang', 'active'),
            ('MIEN_TAY_XA_100K', 'Miền Tây xa — 100.000đ', 'province', 90, 'An Giang, Hậu Giang, Đồng Tháp, Long An, Bạc Liêu, Kiên Giang, Cà Mau', 'active'),
            ('DONG_NAM_BO_120K', 'Đông Nam Bộ — 120.000đ', 'region', 80, 'TP.HCM, Bình Dương, Đồng Nai, BR-VT, Tây Ninh, BP', 'active'),
            ('TAY_NGUYEN_150K', 'Tây Nguyên — 150.000đ', 'region', 70, 'Đắk Lắk, Đắk Nông, Gia Lai, Kon Tum, Lâm Đồng', 'active'),
            ('MIEN_TRUNG_180K', 'Miền Trung — 180.000đ', 'region', 60, 'Từ Bình Thuận ra Thanh Hóa', 'active'),
            ('MIEN_BAC_220K', 'Miền Bắc — 220.000đ', 'region', 50, 'Hà Nội + đồng bằng sông Hồng', 'active')
        `);
        
        // 3. Get zone IDs
        const [zones] = await db.query('SELECT id, zone_code FROM shipping_zones');
        const zoneMap = {};
        zones.forEach(z => { zoneMap[z.zone_code] = z.id; });
        
        console.log('✅ Created zones:', zones.length);
        
        // 4. Insert rules
        console.log('📝 Creating rules...');
        
        // Rule 1: Trà Vinh FREE
        await db.query(`
            INSERT INTO shipping_zone_rules
            (zone_id, rule_name, fixed_fee, province_codes, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
            VALUES (?, 'Trà Vinh — miễn phí toàn tỉnh', 0, ?, 100, 0, 0, 0, 'active')
        `, [zoneMap['TRA_VINH_FREE'], JSON.stringify(['84'])]);
        
        // Rule 2: Lân cận 70k
        await db.query(`
            INSERT INTO shipping_zone_rules
            (zone_id, rule_name, fixed_fee, province_codes, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
            VALUES (?, 'Lân cận Trà Vinh — 70.000đ', 70000, ?, 5, 5000, 70000, 150000, 'active')
        `, [zoneMap['LAN_CAN_70K'], JSON.stringify(['86','83','94','92','82'])]);
        
        // Rule 3: Miền Tây xa 100k
        await db.query(`
            INSERT INTO shipping_zone_rules
            (zone_id, rule_name, fixed_fee, province_codes, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
            VALUES (?, 'Miền Tây xa hơn — 100.000đ', 100000, ?, 5, 5000, 100000, 200000, 'active')
        `, [zoneMap['MIEN_TAY_XA_100K'], JSON.stringify(['89','93','87','80','95','91','96'])]);
        
        // Rule 4: Đông Nam Bộ 120k
        await db.query(`
            INSERT INTO shipping_zone_rules
            (zone_id, rule_name, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
            VALUES (?, 'Đông Nam Bộ — 120.000đ', 120000, 'DONG_NAM_BO', 5, 5000, 120000, 250000, 'active')
        `, [zoneMap['DONG_NAM_BO_120K']]);
        
        // Rule 5: Tây Nguyên 150k
        await db.query(`
            INSERT INTO shipping_zone_rules
            (zone_id, rule_name, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
            VALUES (?, 'Tây Nguyên — 150.000đ', 150000, 'TAY_NGUYEN', 5, 5000, 150000, 300000, 'active')
        `, [zoneMap['TAY_NGUYEN_150K']]);
        
        // Rule 6: Miền Trung 180k
        await db.query(`
            INSERT INTO shipping_zone_rules
            (zone_id, rule_name, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
            VALUES (?, 'Miền Trung — 180.000đ', 180000, 'MIEN_TRUNG', 5, 5000, 180000, 350000, 'active')
        `, [zoneMap['MIEN_TRUNG_180K']]);
        
        // Rule 7: Miền Bắc 220k
        await db.query(`
            INSERT INTO shipping_zone_rules
            (zone_id, rule_name, fixed_fee, region_code, weight_limit_kg, extra_per_kg, min_fee, max_fee, status)
            VALUES (?, 'Miền Bắc — 220.000đ', 220000, 'MIEN_BAC', 5, 5000, 220000, 400000, 'active')
        `, [zoneMap['MIEN_BAC_220K']]);
        
        const [rules] = await db.query('SELECT COUNT(*) as count FROM shipping_zone_rules WHERE status = "active"');
        console.log('✅ Created rules:', rules[0].count);
        
        // 5. Verify
        console.log('\n📋 FINAL CHECK:');
        const [finalZones] = await db.query('SELECT zone_code, zone_name, priority FROM shipping_zones WHERE status = "active" ORDER BY priority DESC');
        finalZones.forEach(z => {
            console.log(`   - ${z.zone_code}: ${z.zone_name} (priority: ${z.priority})`);
        });
        
        const [vinhLongRule] = await db.query(`
            SELECT z.zone_name, r.rule_name, r.fixed_fee, r.province_codes
            FROM shipping_zones z
            JOIN shipping_zone_rules r ON z.id = r.zone_id
            WHERE JSON_CONTAINS(r.province_codes, '"86"', '$')
        `);
        
        console.log('\n🔍 Rule cho Vĩnh Long (code 86):');
        if (vinhLongRule.length > 0) {
            console.log(`   Zone: ${vinhLongRule[0].zone_name}`);
            console.log(`   Rule: ${vinhLongRule[0].rule_name}`);
            console.log(`   Phí: ${vinhLongRule[0].fixed_fee}đ`);
        } else {
            console.log('   ❌ Không tìm thấy!');
        }
        
        console.log('\n✅ DONE! Zones & Rules đã được tạo thành công!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

seedZones();
