/**
 * Verification script for requireAdmin and path/method mapping
 * Run: node scripts/verify_permissions_new.js
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { requireAdmin } = require('../middleware/authMiddleware');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function testMiddleware() {
    console.log('🧪 Starting verify_permissions_new.js...');

    // 1. Get employees from DB to perform realistic tests
    const [employees] = await db.query(
        'SELECT ma_nhan_vien, ho_ten, chuc_vu FROM nhan_vien WHERE trang_thai = 1 LIMIT 3'
    );

    if (employees.length === 0) {
        console.error('❌ No active employees found in DB. Add one first.');
        process.exit(1);
    }

    console.log(`✅ Loaded ${employees.length} active employees for testing:`);
    for (const emp of employees) {
        const [perms] = await db.query('SELECT quyen FROM phan_quyen WHERE ma_nhan_vien = ?', [emp.ma_nhan_vien]);
        const permList = perms.length > 0 ? (typeof perms[0].quyen === 'string' ? JSON.parse(perms[0].quyen) : perms[0].quyen) : {};
        const activePerms = Object.keys(permList).filter(k => permList[k]);
        console.log(`   - ID: ${emp.ma_nhan_vien} | ${emp.ho_ten} (${emp.chuc_vu}) | Permissions: [${activePerms.join(', ')}]`);
    }
    console.log('');

    // Let's test employee 1 (Nguyễn Văn A) and employee 2 (Trần Thị B)
    const emp1 = employees[0];
    const [emp1Perms] = await db.query('SELECT quyen FROM phan_quyen WHERE ma_nhan_vien = ?', [emp1.ma_nhan_vien]);
    const emp1PermList = emp1Perms.length > 0 ? (typeof emp1Perms[0].quyen === 'string' ? JSON.parse(emp1Perms[0].quyen) : emp1Perms[0].quyen) : {};

    // Helper to run middleware
    const runTest = (userPayload, method, path, body = {}) => {
        return new Promise((resolve) => {
            const req = {
                method,
                path,
                body,
                headers: {},
                user: userPayload
            };

            const res = {
                status(code) {
                    this.statusCode = code;
                    return this;
                },
                json(data) {
                    resolve({ allowed: false, status: this.statusCode || 200, data });
                }
            };

            const next = (err) => {
                if (err) {
                    resolve({ allowed: false, error: err });
                } else {
                    resolve({ allowed: true });
                }
            };

            requireAdmin(req, res, next).catch(err => {
                resolve({ allowed: false, error: err.message });
            });
        });
    };

    // Test cases for Employee 1
    const emp1Payload = {
        ma_nhan_vien: emp1.ma_nhan_vien,
        ten_dang_nhap: emp1.ten_dang_nhap,
        vai_tro: 'nhan_vien',
        chuc_vu: emp1.chuc_vu
    };

    console.log('📋 Running test scenarios...');

    // Scenario A: GET /products (requires view_products)
    const hasViewProducts = !!emp1PermList['view_products'];
    console.log(`\nScenario A: GET /products (Expected: ${hasViewProducts ? 'ALLOW' : 'DENY'})`);
    const resA = await runTest(emp1Payload, 'GET', '/products');
    console.log(`Result: ${resA.allowed ? '✅ ALLOWED' : '❌ DENIED (Status: ' + resA.status + ', Message: ' + resA.data.message + ')'}`);
    if (resA.allowed !== hasViewProducts) {
        console.error('❌ Assertion failed for Scenario A!');
    } else {
        console.log('✅ Assertion passed for Scenario A');
    }

    // Scenario B: POST /products (requires add_product)
    const hasAddProduct = !!emp1PermList['add_product'];
    console.log(`\nScenario B: POST /products (Expected: ${hasAddProduct ? 'ALLOW' : 'DENY'})`);
    const resB = await runTest(emp1Payload, 'POST', '/products');
    console.log(`Result: ${resB.allowed ? '✅ ALLOWED' : '❌ DENIED (Status: ' + resB.status + ', Message: ' + resB.data.message + ')'}`);
    if (resB.allowed !== hasAddProduct) {
        console.error('❌ Assertion failed for Scenario B!');
    } else {
        console.log('✅ Assertion passed for Scenario B');
    }

    // Scenario C: PUT /permissions/1 (requires manage_permissions)
    const hasManagePermissions = !!emp1PermList['manage_permissions'];
    console.log(`\nScenario C: PUT /permissions/1 (Expected: ${hasManagePermissions ? 'ALLOW' : 'DENY'})`);
    const resC = await runTest(emp1Payload, 'PUT', '/permissions/1');
    console.log(`Result: ${resC.allowed ? '✅ ALLOWED' : '❌ DENIED (Status: ' + resC.status + ', Message: ' + resC.data.message + ')'}`);
    if (resC.allowed !== hasManagePermissions) {
        console.error('❌ Assertion failed for Scenario C!');
    } else {
        console.log('✅ Assertion passed for Scenario C');
    }

    // Scenario D: PUT /orders/123/status with cancelling (requires cancel_orders)
    const hasCancelOrders = !!emp1PermList['cancel_orders'];
    console.log(`\nScenario D: PUT /orders/123/status (cancel) (Expected: ${hasCancelOrders ? 'ALLOW' : 'DENY'})`);
    const resD = await runTest(emp1Payload, 'PUT', '/orders/123/status', { status: 'cancelled' });
    console.log(`Result: ${resD.allowed ? '✅ ALLOWED' : '❌ DENIED (Status: ' + resD.status + ', Message: ' + resD.data.message + ')'}`);
    if (resD.allowed !== hasCancelOrders) {
        console.error('❌ Assertion failed for Scenario D!');
    } else {
        console.log('✅ Assertion passed for Scenario D');
    }

    // Scenario E: Admin user bypass
    console.log(`\nScenario E: Admin User Bypass (Expected: ALLOW)`);
    const adminPayload = {
        ma_tai_khoan: 1,
        vai_tro: 'admin'
    };
    const resE = await runTest(adminPayload, 'PUT', '/permissions/1');
    console.log(`Result: ${resE.allowed ? '✅ ALLOWED' : '❌ DENIED'}`);
    if (!resE.allowed) {
        console.error('❌ Assertion failed for Scenario E!');
    } else {
        console.log('✅ Assertion passed for Scenario E');
    }

    console.log('\n🏁 Test complete.');
    db.end();
}

testMiddleware().catch(err => {
    console.error('Test run error:', err);
    db.end();
});
