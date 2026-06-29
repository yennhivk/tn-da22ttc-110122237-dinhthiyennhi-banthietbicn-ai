/**
 * Script thêm tất cả sản phẩm từ danh mục mở rộng vào CSDL
 * Chạy: node backend/scripts/add-all-products.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/database');

// Danh mục sản phẩm
const categories = {
    'Điện thoại': 1,
    'Laptop': 2,
    'Phụ kiện': 3,
    'Điện máy': 4  // Cần thêm danh mục này
};

// Tất cả sản phẩm từ danh mục mở rộng
const allProducts = [
    // ĐIỆN THOẠI (ma_danh_muc = 1)
    { name: 'iPhone 15 Pro Max', price: 34990000, image: 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=400&h=400&fit=crop', category: 1, brand: 'Apple', qty: 15 },
    { name: 'Samsung S24 Ultra', price: 25990000, image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop', category: 1, brand: 'Samsung', qty: 12 },
    { name: 'Xiaomi 14 Pro', price: 19990000, image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop', category: 1, brand: 'Xiaomi', qty: 20 },
    { name: 'OPPO Find X7', price: 22990000, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop', category: 1, brand: 'OPPO', qty: 10 },
    { name: 'iPhone 14 Pro', price: 27990000, image: 'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?w=400&h=400&fit=crop', category: 1, brand: 'Apple', qty: 8 },
    { name: 'Samsung S23 FE', price: 12990000, image: 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=400&h=400&fit=crop', category: 1, brand: 'Samsung', qty: 25 },
    { name: 'Galaxy Z Fold 5', price: 42990000, image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop', category: 1, brand: 'Samsung', qty: 5 },
    { name: 'Redmi Note 13 Pro', price: 8990000, image: 'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400&h=400&fit=crop', category: 1, brand: 'Xiaomi', qty: 30 },
    
    // LAPTOP (ma_danh_muc = 2)
    { name: 'MacBook Pro M3', price: 54990000, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop', category: 2, brand: 'Apple', qty: 8 },
    { name: 'Dell XPS 15', price: 42990000, image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&h=400&fit=crop', category: 2, brand: 'Dell', qty: 6 },
    { name: 'Asus ROG Zephyrus', price: 52990000, image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop', category: 2, brand: 'Asus', qty: 5 },
    { name: 'HP Spectre x360', price: 38990000, image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=400&fit=crop', category: 2, brand: 'HP', qty: 7 },
    { name: 'Lenovo ThinkPad X1', price: 45990000, image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop', category: 2, brand: 'Lenovo', qty: 6 },
    { name: 'MSI Creator Z16', price: 49990000, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop', category: 2, brand: 'MSI', qty: 4 },
    { name: 'iMac 24" M3', price: 38990000, image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=400&fit=crop', category: 2, brand: 'Apple', qty: 5 },
    
    // PHỤ KIỆN (ma_danh_muc = 3)
    { name: 'AirPods Pro 2', price: 6990000, image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop', category: 3, brand: 'Apple', qty: 30 },
    { name: 'Apple Watch Series 9', price: 10990000, image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop', category: 3, brand: 'Apple', qty: 15 },
    { name: 'Bàn phím Logitech MX Keys', price: 2990000, image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400&h=400&fit=crop', category: 3, brand: 'Logitech', qty: 25 },
    { name: 'Chuột Logitech MX Master 3', price: 2490000, image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop', category: 3, brand: 'Logitech', qty: 20 },
    { name: 'Tai nghe Sony WH-1000XM5', price: 8990000, image: 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=400&fit=crop', category: 3, brand: 'Sony', qty: 12 },
    { name: 'Webcam Logitech C920', price: 1990000, image: 'https://m.media-amazon.com/images/I/71iNwni9TsL._AC_SL1500_.jpg', category: 3, brand: 'Logitech', qty: 18 },
    { name: 'iPad Pro 2024', price: 28990000, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop', category: 3, brand: 'Apple', qty: 10 },
    { name: 'Galaxy Tab S9', price: 18990000, image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=400&fit=crop', category: 3, brand: 'Samsung', qty: 8 },
    { name: 'Galaxy Buds Pro', price: 4990000, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop', category: 3, brand: 'Samsung', qty: 22 },
    { name: 'Galaxy Watch 6', price: 7990000, image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop', category: 3, brand: 'Samsung', qty: 14 },
    { name: 'Xiaomi Pad 6', price: 12990000, image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=400&fit=crop', category: 3, brand: 'Xiaomi', qty: 10 },
    { name: 'Mi Band 8', price: 990000, image: 'https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?w=400&h=400&fit=crop', category: 3, brand: 'Xiaomi', qty: 50 },
    { name: 'Redmi Buds 4 Pro', price: 1990000, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop', category: 3, brand: 'Xiaomi', qty: 35 },
    
    // ĐIỆN MÁY (ma_danh_muc = 4)
    { name: 'Tủ lạnh Samsung Inverter', price: 8990000, image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&h=400&fit=crop', category: 4, brand: 'Samsung', qty: 8 },
    { name: 'Máy giặt LG AI', price: 12990000, image: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=400&h=400&fit=crop', category: 4, brand: 'LG', qty: 6 },
    { name: 'Tivi Sony 4K 55"', price: 18990000, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop', category: 4, brand: 'Sony', qty: 5 },
    { name: 'Điều hòa Daikin Inverter', price: 9990000, image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop', category: 4, brand: 'Daikin', qty: 10 },
    { name: 'Máy lọc không khí Sharp', price: 5990000, image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop', category: 4, brand: 'Sharp', qty: 12 },
    { name: 'Nồi cơm điện Toshiba', price: 2490000, image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop', category: 4, brand: 'Toshiba', qty: 20 },
    { name: 'Xiaomi Smart TV 55"', price: 9990000, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop', category: 4, brand: 'Xiaomi', qty: 7 }
];

async function addAllProducts() {
    console.log('🚀 Bắt đầu thêm sản phẩm vào CSDL...\n');
    
    try {
        // 1. Kiểm tra và thêm danh mục "Điện máy" nếu chưa có
        const [existingCategories] = await db.query('SELECT * FROM danh_muc_san_pham');
        console.log('📂 Danh mục hiện có:', existingCategories.map(c => c.ten_danh_muc).join(', '));
        
        const hasAppliances = existingCategories.some(c => c.ten_danh_muc === 'Điện máy');
        if (!hasAppliances) {
            await db.query(`INSERT INTO danh_muc_san_pham (ten_danh_muc, mo_ta) VALUES ('Điện máy', 'Tủ lạnh, máy giặt, điều hòa và các thiết bị điện gia dụng')`);
            console.log('✅ Đã thêm danh mục "Điện máy"\n');
        }
        
        // Lấy lại danh mục sau khi thêm
        const [categories] = await db.query('SELECT ma_danh_muc, ten_danh_muc FROM danh_muc_san_pham');
        const categoryMap = {};
        categories.forEach(c => {
            if (c.ten_danh_muc === 'Điện thoại') categoryMap[1] = c.ma_danh_muc;
            if (c.ten_danh_muc === 'Laptop') categoryMap[2] = c.ma_danh_muc;
            if (c.ten_danh_muc === 'Phụ kiện') categoryMap[3] = c.ma_danh_muc;
            if (c.ten_danh_muc === 'Điện máy') categoryMap[4] = c.ma_danh_muc;
        });
        console.log('📂 Category Map:', categoryMap);
        
        let added = 0;
        let updated = 0;
        let skipped = 0;
        
        for (const product of allProducts) {
            // Kiểm tra sản phẩm đã tồn tại chưa
            const [existing] = await db.query(
                'SELECT ma_san_pham FROM san_pham WHERE ten_san_pham = ?',
                [product.name]
            );
            
            const realCategoryId = categoryMap[product.category] || product.category;
            
            if (existing.length > 0) {
                // Cập nhật sản phẩm và hình ảnh
                const productId = existing[0].ma_san_pham;
                await db.query(`
                    UPDATE san_pham SET 
                        gia = ?, so_luong = ?, thuong_hieu = ?, ma_danh_muc = ?, trang_thai = 'hien_thi'
                    WHERE ma_san_pham = ?
                `, [product.price, product.qty, product.brand, realCategoryId, productId]);
                
                // Cập nhật hoặc thêm hình ảnh
                const [existingImage] = await db.query(
                    'SELECT ma_anh FROM anh_san_pham WHERE ma_san_pham = ? AND la_anh_chinh = 1',
                    [productId]
                );
                
                if (existingImage.length > 0) {
                    await db.query('UPDATE anh_san_pham SET duong_dan_anh = ? WHERE ma_anh = ?', 
                        [product.image, existingImage[0].ma_anh]);
                } else {
                    await db.query('INSERT INTO anh_san_pham (ma_san_pham, duong_dan_anh, la_anh_chinh) VALUES (?, ?, 1)',
                        [productId, product.image]);
                }
                
                console.log(`🔄 Cập nhật: ${product.name}`);
                updated++;
            } else {
                // Thêm sản phẩm mới
                const [result] = await db.query(`
                    INSERT INTO san_pham (ten_san_pham, mo_ta, gia, so_luong, thuong_hieu, ma_danh_muc, trang_thai)
                    VALUES (?, ?, ?, ?, ?, ?, 'hien_thi')
                `, [product.name, `${product.name} chính hãng`, product.price, product.qty, product.brand, realCategoryId]);
                
                // Thêm hình ảnh
                await db.query(`
                    INSERT INTO anh_san_pham (ma_san_pham, duong_dan_anh, la_anh_chinh)
                    VALUES (?, ?, 1)
                `, [result.insertId, product.image]);
                
                console.log(`➕ Thêm mới: ${product.name} (ID: ${result.insertId})`);
                added++;
            }
        }
        
        console.log('\n========================================');
        console.log('📊 KẾT QUẢ:');
        console.log(`   ➕ Đã thêm mới: ${added} sản phẩm`);
        console.log(`   🔄 Đã cập nhật: ${updated} sản phẩm`);
        console.log(`   Tổng: ${added + updated} sản phẩm`);
        console.log('========================================\n');
        
        // Hiển thị danh sách sản phẩm
        const [finalProducts] = await db.query(`
            SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia, sp.thuong_hieu, dm.ten_danh_muc,
                   (SELECT duong_dan_anh FROM anh_san_pham WHERE ma_san_pham = sp.ma_san_pham AND la_anh_chinh = 1 LIMIT 1) as anh
            FROM san_pham sp
            LEFT JOIN danh_muc_san_pham dm ON sp.ma_danh_muc = dm.ma_danh_muc
            WHERE sp.trang_thai = 'hien_thi'
            ORDER BY dm.ten_danh_muc, sp.ten_san_pham
        `);
        
        console.log(`📋 TỔNG SỐ SẢN PHẨM TRONG CSDL: ${finalProducts.length}`);
        console.log('----------------------------------------');
        
        let currentCategory = '';
        finalProducts.forEach(p => {
            if (p.ten_danh_muc !== currentCategory) {
                currentCategory = p.ten_danh_muc;
                console.log(`\n📁 ${currentCategory || 'Chưa phân loại'}:`);
            }
            const hasImage = p.anh ? '✅' : '❌';
            console.log(`   ${hasImage} [${p.ma_san_pham}] ${p.ten_san_pham} - ${p.gia.toLocaleString()}đ (${p.thuong_hieu})`);
        });
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

addAllProducts();
