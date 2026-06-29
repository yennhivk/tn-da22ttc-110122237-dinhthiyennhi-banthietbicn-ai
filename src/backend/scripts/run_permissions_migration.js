const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    let connection;
    
    try {
        console.log('🔌 Connecting to database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'yen_nhi_tech',
            multipleStatements: true
        });

        console.log('✅ Connected to database');

        // Read migration file
        const migrationPath = path.join(__dirname, '../migrations/create_permissions.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Running permissions migration...');
        await connection.query(sql);

        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('📋 Created tables:');
        console.log('   - phan_quyen (Permissions)');
        console.log('   - log_hoat_dong (Activity Log)');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

runMigration();
