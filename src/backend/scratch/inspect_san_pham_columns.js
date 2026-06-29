const db = require('../config/database');

async function inspectColumns() {
    try {
        console.log('Inspecting san_pham columns:');
        const [cols] = await db.query('DESCRIBE san_pham');
        console.table(cols);
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit();
}

inspectColumns();
