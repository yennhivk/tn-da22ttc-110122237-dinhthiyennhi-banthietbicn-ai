const db = require('./config/database');

async function inspect() {
    try {
        const [regions] = await db.query('SELECT * FROM shipping_region_mappings');
        console.log('Region Mappings:', regions);

        const [provinces] = await db.query(`
            SELECT region_code, GROUP_CONCAT(province_name ORDER BY province_name SEPARATOR ', ') AS provinces
            FROM shipping_provinces
            GROUP BY region_code
        `);
        console.log('Provinces by Region:', provinces);
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit();
}

inspect();
