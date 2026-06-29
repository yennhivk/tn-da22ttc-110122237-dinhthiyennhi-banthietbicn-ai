const db = require('../config/database');

async function addProfileColumns() {
    try {
        console.log('⏳ Adding demographic and preference columns to tai_khoan table...');
        
        // Add muc_dich_su_dung column if not exists
        try {
            await db.query(`ALTER TABLE tai_khoan ADD COLUMN muc_dich_su_dung VARCHAR(100) DEFAULT NULL`);
            console.log('✅ Added column muc_dich_su_dung');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Column muc_dich_su_dung already exists');
            } else {
                throw e;
            }
        }
        
        // Add phan_khuc_ngan_sach column if not exists
        try {
            await db.query(`ALTER TABLE tai_khoan ADD COLUMN phan_khuc_ngan_sach VARCHAR(100) DEFAULT NULL`);
            console.log('✅ Added column phan_khuc_ngan_sach');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Column phan_khuc_ngan_sach already exists');
            } else {
                throw e;
            }
        }

        console.log('🎉 Data Mining Profile Columns Setup Completed Successfully!');
    } catch (err) {
        console.error('❌ Failed to update tai_khoan table:', err);
    } finally {
        process.exit();
    }
}

addProfileColumns();
