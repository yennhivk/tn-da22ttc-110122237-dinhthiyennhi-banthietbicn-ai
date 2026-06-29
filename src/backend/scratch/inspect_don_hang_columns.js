const db = require('../config/database');

async function inspectColumns() {
    try {
        console.log('Inspecting don_hang columns:');
        const [donHangCols] = await db.query('DESCRIBE don_hang');
        console.table(donHangCols);

        console.log('\nInspecting don_dat_hang columns:');
        try {
            const [donDatHangCols] = await db.query('DESCRIBE don_dat_hang');
            console.table(donDatHangCols);
        } catch (e) {
            console.log('don_dat_hang table does not exist or error:', e.message);
        }
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit();
}

inspectColumns();
