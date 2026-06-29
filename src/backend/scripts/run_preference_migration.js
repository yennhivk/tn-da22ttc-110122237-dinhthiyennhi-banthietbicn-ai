const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, '../migrations/create_user_preferences.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        const statements = sqlContent.split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('-- USE'));

        console.log('Running migration: create_user_preferences.sql');
        for (let statement of statements) {
            if (statement.toUpperCase().startsWith('USE ')) continue;
            console.log('Executing:', statement.substring(0, 50) + '...');
            await db.query(statement);
        }
        
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
