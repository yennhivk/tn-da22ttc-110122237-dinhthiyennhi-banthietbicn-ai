/**
 * Script cập nhật hình ảnh sản phẩm từ danh mục mở rộng vào CSDL
 * Chạy: node backend/scripts/update-product-images.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/database');

// Dữ liệu hình ảnh sản phẩm từ danh mục mở rộng
const productImages = {
    // ĐIỆN THOẠI
    'iPhone 15 Pro Max': 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=400&h=400&fit=crop',
    'Samsung S24 Ultra': 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop',
    'Samsung Galaxy S24 Ultra': 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop',
    'Xiaomi 14 Pro': 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop',
    'OPPO Find X7': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
    'iPhone 14 Pro': 'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?w=400&h=400&fit=crop',
    'Samsung S23 FE': 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=400&h=400&fit=crop',
    
    // LAPTOP
    'MacBook Pro M3': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop',
    'MacBook Air M3': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop',
    'MacBook Air M3 2024': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop',
    'Dell XPS 15': 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&h=400&fit=crop',
    'Dell XPS 13 Plus': 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&h=400&fit=crop',
    'Asus ROG Zephyrus': 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop',
    'HP Spectre x360': 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=400&fit=crop',
    'Lenovo ThinkPad X1': 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop',
    'MSI Creator Z16': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
    
    // ĐIỆN MÁY
    'Tủ lạnh Samsung Inverter': 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&h=400&fit=crop',
    'Máy giặt LG AI': 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=400&h=400&fit=crop',
    'Tivi Sony 4K 55"': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop',
    'Điều hòa Daikin Inverter': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop',
    'Máy lọc không khí Sharp': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop',
    'Nồi cơm điện Toshiba': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop',
    
    // PHỤ KIỆN
    'AirPods Pro 2': 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop',
    'Tai nghe AirPods Pro 2': 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop',
    'Apple Watch Series 9': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop',
    'Bàn phím Logitech MX Keys': 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400&h=400&fit=crop',
    'Chuột Logitech MX Master 3': 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop',
    'Tai nghe Sony WH-1000XM5': 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=400&fit=crop',
    'Webcam Logitech C920': 'https://m.media-amazon.com/images/I/71iNwni9TsL._AC_SL1500_.jpg',
    'Sạc nhanh 65W Anker': 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop',
    
    // SAMSUNG
    'Galaxy Z Fold 5': 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop',
    'Galaxy Tab S9': 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=400&fit=crop',
    'Galaxy Buds Pro': 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop',
    'Galaxy Watch 6': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop',
    
    // XIAOMI
    'Redmi Note 13 Pro': 'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400&h=400&fit=crop',
    'Xiaomi Pad 6': 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=400&fit=crop',
    'Mi Band 8': 'https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?w=400&h=400&fit=crop',
    'Redmi Buds 4 Pro': 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop',
    'Xiaomi Smart TV 55"': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop',
    
    // APPLE
    'iPad Pro 2024': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop',
    'iMac 24" M3': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=400&fit=crop'
};

async function updateProductImages() {
    console.log('🔄 Bắt đầu cập nhật hình ảnh sản phẩm...\n');
    
    try {
        // Lấy tất cả sản phẩm
        const [products] = await db.query(`
            SELECT sp.ma_san_pham, sp.ten_san_pham, asp.ma_anh, asp.duong_dan_anh
            FROM san_pham sp
            LEFT JOIN anh_san_pham asp ON sp.ma_san_pham = asp.ma_san_pham AND asp.la_anh_chinh = 1
        `);
        
        console.log(`📦 Tìm thấy ${products.length} sản phẩm trong CSDL\n`);
        
        let updated = 0;
        let inserted = 0;
        let skipped = 0;
        
        for (const product of products) {
            // Tìm hình ảnh phù hợp
            let newImageUrl = null;
            
            // Tìm chính xác
            if (productImages[product.ten_san_pham]) {
                newImageUrl = productImages[product.ten_san_pham];
            } else {
                // Tìm theo từ khóa
                for (const [name, url] of Object.entries(productImages)) {
                    if (product.ten_san_pham.toLowerCase().includes(name.toLowerCase()) ||
                        name.toLowerCase().includes(product.ten_san_pham.toLowerCase())) {
                        newImageUrl = url;
                        break;
                    }
                }
            }
            
            if (newImageUrl) {
                if (product.ma_anh) {
                    // Cập nhật ảnh hiện có
                    await db.query(`
                        UPDATE anh_san_pham 
                        SET duong_dan_anh = ? 
                        WHERE ma_anh = ?
                    `, [newImageUrl, product.ma_anh]);
                    console.log(`✅ Cập nhật: ${product.ten_san_pham}`);
                    updated++;
                } else {
                    // Thêm ảnh mới
                    await db.query(`
                        INSERT INTO anh_san_pham (ma_san_pham, duong_dan_anh, la_anh_chinh)
                        VALUES (?, ?, 1)
                    `, [product.ma_san_pham, newImageUrl]);
                    console.log(`➕ Thêm mới: ${product.ten_san_pham}`);
                    inserted++;
                }
            } else {
                console.log(`⏭️  Bỏ qua: ${product.ten_san_pham} (không tìm thấy hình)`);
                skipped++;
            }
        }
        
        console.log('\n========================================');
        console.log('📊 KẾT QUẢ:');
        console.log(`   ✅ Đã cập nhật: ${updated} sản phẩm`);
        console.log(`   ➕ Đã thêm mới: ${inserted} sản phẩm`);
        console.log(`   ⏭️  Bỏ qua: ${skipped} sản phẩm`);
        console.log('========================================\n');
        
        // Hiển thị kết quả cuối cùng
        const [result] = await db.query(`
            SELECT sp.ma_san_pham, sp.ten_san_pham, asp.duong_dan_anh
            FROM san_pham sp
            LEFT JOIN anh_san_pham asp ON sp.ma_san_pham = asp.ma_san_pham AND asp.la_anh_chinh = 1
            ORDER BY sp.ma_san_pham
        `);
        
        console.log('📋 DANH SÁCH SẢN PHẨM SAU KHI CẬP NHẬT:');
        console.log('----------------------------------------');
        result.forEach(p => {
            const status = p.duong_dan_anh ? '✅' : '❌';
            console.log(`${status} [${p.ma_san_pham}] ${p.ten_san_pham}`);
            if (p.duong_dan_anh) {
                console.log(`   📷 ${p.duong_dan_anh.substring(0, 60)}...`);
            }
        });
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        process.exit(0);
    }
}

updateProductImages();
