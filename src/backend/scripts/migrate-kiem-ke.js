const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigration() {
    try {
        console.log('🔄 Checking inventory audit (Kiểm kê) tables in database...');
        
        // Check if phieu_kiem_ke exists
        const [tables] = await db.query("SHOW TABLES LIKE 'phieu_kiem_ke'");
        
        if (tables.length > 0) {
            console.log('✅ Tables already exist! No migration needed.');
            process.exit(0);
        }
        
        console.log('📂 Reading migration file create_kiem_ke.sql...');
        const migrationPath = path.join(__dirname, '../migrations/create_kiem_ke.sql');
        const sqlContent = fs.readFileSync(migrationPath, 'utf8');
        
        // Split SQL statements by semicolon, but be careful with multi-line statements if any
        // Since create_kiem_ke.sql has simple statements, we can split by ';'
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);
            
        console.log(`🚀 Executing ${statements.length} SQL statements...`);
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            for (const statement of statements) {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                await connection.query(statement);
            }
            await connection.commit();
            console.log('✅ Migration create_kiem_ke.sql executed successfully!');
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
