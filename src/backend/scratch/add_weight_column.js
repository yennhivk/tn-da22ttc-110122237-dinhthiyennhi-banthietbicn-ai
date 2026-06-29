const db = require('../config/database');

async function runMigration() {
    try {
        console.log('1. Checking if trong_luong_kg column already exists in san_pham...');
        const [columns] = await db.query('DESCRIBE san_pham');
        const hasWeightCol = columns.some(col => col.Field === 'trong_luong_kg');

        if (!hasWeightCol) {
            console.log('Column trong_luong_kg does not exist. Adding column...');
            await db.query('ALTER TABLE san_pham ADD COLUMN trong_luong_kg DECIMAL(10,2) DEFAULT 0.50');
            console.log('✅ Column trong_luong_kg added successfully!');
        } else {
            console.log('Column trong_luong_kg already exists.');
        }

        console.log('\n2. Updating realistic weights for products based on category/name keywords...');
        
        // Update PC cases and large items
        const [updateCases] = await db.query(`
            UPDATE san_pham 
            SET trong_luong_kg = 8.50 
            WHERE ten_san_pham LIKE '%NZXT%' OR ten_san_pham LIKE '%Case%' OR ten_san_pham LIKE '%Thùng%' OR ten_san_pham LIKE '%Vỏ máy%'
        `);
        console.log(`- Updated PC cases/NZXT: ${updateCases.affectedRows} products set to 8.5kg`);

        // Update laptops
        const [updateLaptops] = await db.query(`
            UPDATE san_pham 
            SET trong_luong_kg = 1.80 
            WHERE ten_san_pham LIKE '%Laptop%' OR ten_san_pham LIKE '%MacBook%' OR ten_san_pham LIKE '%ASUS Vivobook%' OR ten_san_pham LIKE '%Yoga%' OR ten_san_pham LIKE '%Lenovo%'
        `);
        console.log(`- Updated Laptops: ${updateLaptops.affectedRows} products set to 1.8kg`);

        // Update keyboards
        const [updateKeyboards] = await db.query(`
            UPDATE san_pham 
            SET trong_luong_kg = 1.10 
            WHERE ten_san_pham LIKE '%Bàn phím%' OR ten_san_pham LIKE '%Keyboard%'
        `);
        console.log(`- Updated Keyboards: ${updateKeyboards.affectedRows} products set to 1.1kg`);

        // Update mice
        const [updateMice] = await db.query(`
            UPDATE san_pham 
            SET trong_luong_kg = 0.15 
            WHERE ten_san_pham LIKE '%Chuột%' OR ten_san_pham LIKE '%Mouse%' OR ten_san_pham LIKE '%SteelSeries Rival%'
        `);
        console.log(`- Updated Mice: ${updateMice.affectedRows} products set to 0.15kg`);

        // Update monitors
        const [updateMonitors] = await db.query(`
            UPDATE san_pham 
            SET trong_luong_kg = 5.20 
            WHERE ten_san_pham LIKE '%Màn hình%' OR ten_san_pham LIKE '%Monitor%'
        `);
        console.log(`- Updated Monitors: ${updateMonitors.affectedRows} products set to 5.2kg`);

        // Let's verify the results
        console.log('\n3. Verifying updated product weights:');
        const [products] = await db.query('SELECT ten_san_pham, trong_luong_kg FROM san_pham LIMIT 10');
        console.table(products);

    } catch (err) {
        console.error('Migration error:', err);
    }
    process.exit();
}

runMigration();
