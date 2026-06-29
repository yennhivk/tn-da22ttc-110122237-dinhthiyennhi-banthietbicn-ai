/**
 * Script thêm tất cả sản phẩm Gaming từ trang chủ vào CSDL
 * Bao gồm: PC Gaming, Laptop Gaming, Chuột Gaming, Bàn phím Gaming
 * Chạy: node backend/scripts/add-gaming-products.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/database');

// Tất cả sản phẩm Gaming từ trang chủ
const gamingProducts = [
    // ==========================================
    // PC GAMING BÁN CHẠY
    // ==========================================
    { name: 'PC ASUS ROG i9-14900K RTX 4090', price: 89990000, oldPrice: 99990000, image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&h=400&fit=crop', category: 'PC Gaming', brand: 'ASUS', qty: 5, desc: 'PC Gaming cao cấp với Intel Core i9-14900K và RTX 4090, hiệu năng đỉnh cao cho game thủ chuyên nghiệp' },
    { name: 'PC MSI i7-13700K RTX 4080', price: 69990000, oldPrice: 79990000, image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop', category: 'PC Gaming', brand: 'MSI', qty: 8, desc: 'PC Gaming MSI với Intel Core i7-13700K và RTX 4080, cân mọi tựa game AAA' },
    { name: 'PC Gigabyte i5-13600K RTX 4070', price: 45990000, oldPrice: 52990000, image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&h=400&fit=crop', category: 'PC Gaming', brand: 'Gigabyte', qty: 10, desc: 'PC Gaming Gigabyte với Intel Core i5-13600K và RTX 4070, hiệu năng/giá tốt nhất' },
    { name: 'PC Custom Build AMD Ryzen 9', price: 75990000, oldPrice: null, image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop', category: 'PC Gaming', brand: 'Custom', qty: 3, desc: 'PC Gaming Custom Build với AMD Ryzen 9, RGB đẹp mắt, hiệu năng mạnh mẽ' },
    
    // ==========================================
    // LAPTOP GAMING
    // ==========================================
    { name: 'ASUS ROG Strix G16 i9 RTX 4070', price: 54990000, oldPrice: 64990000, image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop', category: 'Laptop', brand: 'ASUS', qty: 6, desc: 'Laptop Gaming ASUS ROG Strix G16 với Intel Core i9 và RTX 4070, màn hình 16 inch 165Hz' },
    { name: 'MSI Katana 15 i7 RTX 4060', price: 36990000, oldPrice: 42990000, image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop', category: 'Laptop', brand: 'MSI', qty: 12, desc: 'Laptop Gaming MSI Katana 15 với Intel Core i7 và RTX 4060, thiết kế mỏng nhẹ' },
    { name: 'Acer Predator Helios i7 RTX 4070', price: 48990000, oldPrice: 56990000, image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop', category: 'Laptop', brand: 'Acer', qty: 7, desc: 'Laptop Gaming Acer Predator Helios với Intel Core i7 và RTX 4070, tản nhiệt hiệu quả' },
    { name: 'Lenovo Legion 7 i9 RTX 4080', price: 67990000, oldPrice: null, image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=400&fit=crop', category: 'Laptop', brand: 'Lenovo', qty: 4, desc: 'Laptop Gaming Lenovo Legion 7 với Intel Core i9 và RTX 4080, màn hình 2K 240Hz' },
    
    // ==========================================
    // CHUỘT GAMING
    // ==========================================
    { name: 'Logitech G Pro X Superlight', price: 3290000, oldPrice: 3990000, image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop', category: 'Phụ kiện', brand: 'Logitech', qty: 25, desc: 'Chuột Gaming Logitech G Pro X Superlight, siêu nhẹ 63g, sensor HERO 25K' },
    { name: 'Razer DeathAdder V3 Pro', price: 3590000, oldPrice: 4290000, image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&h=400&fit=crop', category: 'Phụ kiện', brand: 'Razer', qty: 20, desc: 'Chuột Gaming Razer DeathAdder V3 Pro, thiết kế ergonomic, sensor Focus Pro 30K' },
    { name: 'SteelSeries Rival 5', price: 1990000, oldPrice: 2490000, image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop', category: 'Phụ kiện', brand: 'SteelSeries', qty: 30, desc: 'Chuột Gaming SteelSeries Rival 5, 9 nút có thể lập trình, RGB PrismSync' },
    { name: 'Corsair Dark Core RGB Pro', price: 2790000, oldPrice: null, image: 'https://images.unsplash.com/photo-1563297007-0686b7003af7?w=400&h=400&fit=crop', category: 'Phụ kiện', brand: 'Corsair', qty: 15, desc: 'Chuột Gaming Corsair Dark Core RGB Pro, wireless/wired, sạc Qi' },
    { name: 'Logitech G502 Hero', price: 1290000, oldPrice: 1590000, image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop', category: 'Phụ kiện', brand: 'Logitech', qty: 40, desc: 'Chuột Gaming Logitech G502 Hero, 11 nút có thể lập trình, sensor HERO 25K' },
    
    // ==========================================
    // BÀN PHÍM GAMING
    // ==========================================
    { name: 'Logitech G Pro X TKL', price: 3990000, oldPrice: 4590000, image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400&h=400&fit=crop', category: 'Phụ kiện', brand: 'Logitech', qty: 18, desc: 'Bàn phím Gaming Logitech G Pro X TKL, switch GX có thể thay thế, RGB LIGHTSYNC' },
    { name: 'Razer BlackWidow V4 Pro', price: 5990000, oldPrice: 6990000, image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop', category: 'Phụ kiện', brand: 'Razer', qty: 10, desc: 'Bàn phím Gaming Razer BlackWidow V4 Pro, switch Razer Green, RGB Chroma' },
    { name: 'Corsair K70 RGB Pro', price: 3590000, oldPrice: null, image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=400&fit=crop', category: 'Phụ kiện', brand: 'Corsair', qty: 15, desc: 'Bàn phím Gaming Corsair K70 RGB Pro, switch Cherry MX, khung nhôm' },
    { name: 'HyperX Alloy Origins Core', price: 2290000, oldPrice: 2790000, image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400&h=400&fit=crop', category: 'Phụ kiện', brand: 'HyperX', qty: 22, desc: 'Bàn phím Gaming HyperX Alloy Origins Core TKL, switch HyperX Red, RGB' },
    { name: 'Logitech G915 TKL', price: 4990000, oldPrice: null, image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop', category: 'Phụ kiện', brand: 'Logitech', qty: 8, desc: 'Bàn phím Gaming Logitech G915 TKL Wireless, switch GL Low Profile, siêu mỏng' },
    
    // ==========================================
    // MÀN HÌNH GAMING
    // ==========================================
    { name: 'ASUS ROG Swift PG27AQN 27" 360Hz', price: 32990000, oldPrice: 38990000, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=400&fit=crop', category: 'Màn hình', brand: 'ASUS', qty: 5, desc: 'Màn hình Gaming ASUS ROG Swift 27 inch, 2K 360Hz, IPS, G-Sync' },
    { name: 'LG UltraGear 27GP950 27" 4K 144Hz', price: 24990000, oldPrice: 29990000, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=400&fit=crop', category: 'Màn hình', brand: 'LG', qty: 8, desc: 'Màn hình Gaming LG UltraGear 27 inch, 4K 144Hz, Nano IPS, HDMI 2.1' },
    { name: 'Samsung Odyssey G7 32" 240Hz', price: 18990000, oldPrice: 22990000, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=400&fit=crop', category: 'Màn hình', brand: 'Samsung', qty: 10, desc: 'Màn hình Gaming Samsung Odyssey G7 32 inch cong, 2K 240Hz, VA' },
    { name: 'Dell Alienware AW2524H 25" 500Hz', price: 28990000, oldPrice: null, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=400&fit=crop', category: 'Màn hình', brand: 'Dell', qty: 3, desc: 'Màn hình Gaming Dell Alienware 25 inch, FHD 500Hz, IPS, cho eSports' },
    
    // ==========================================
    // CPU & VGA
    // ==========================================
    { name: 'Intel Core i9-14900K', price: 15990000, oldPrice: 17990000, image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop', category: 'CPU, VGA', brand: 'Intel', qty: 12, desc: 'CPU Intel Core i9-14900K, 24 nhân 32 luồng, xung nhịp lên đến 6.0GHz' },
    { name: 'AMD Ryzen 9 7950X3D', price: 16990000, oldPrice: 19990000, image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop', category: 'CPU, VGA', brand: 'AMD', qty: 8, desc: 'CPU AMD Ryzen 9 7950X3D, 16 nhân 32 luồng, 3D V-Cache 128MB' },
    { name: 'NVIDIA GeForce RTX 4090', price: 49990000, oldPrice: 54990000, image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop', category: 'CPU, VGA', brand: 'NVIDIA', qty: 5, desc: 'Card đồ họa NVIDIA GeForce RTX 4090 24GB GDDR6X, Ada Lovelace' },
    { name: 'NVIDIA GeForce RTX 4080 Super', price: 32990000, oldPrice: 36990000, image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop', category: 'CPU, VGA', brand: 'NVIDIA', qty: 10, desc: 'Card đồ họa NVIDIA GeForce RTX 4080 Super 16GB GDDR6X' },
    { name: 'AMD Radeon RX 7900 XTX', price: 28990000, oldPrice: 32990000, image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop', category: 'CPU, VGA', brand: 'AMD', qty: 7, desc: 'Card đồ họa AMD Radeon RX 7900 XTX 24GB GDDR6, RDNA 3' },
    
    // ==========================================
    // CASE & NGUỒN
    // ==========================================
    { name: 'NZXT H9 Elite', price: 5990000, oldPrice: 6990000, image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&h=400&fit=crop', category: 'Case, Nguồn', brand: 'NZXT', qty: 15, desc: 'Case NZXT H9 Elite, kính cường lực 4 mặt, hỗ trợ E-ATX' },
    { name: 'Lian Li O11 Dynamic EVO', price: 4590000, oldPrice: 5290000, image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&h=400&fit=crop', category: 'Case, Nguồn', brand: 'Lian Li', qty: 20, desc: 'Case Lian Li O11 Dynamic EVO, thiết kế dual-chamber, hỗ trợ tản nhiệt nước' },
    { name: 'Corsair RM1000x 1000W 80+ Gold', price: 4990000, oldPrice: 5590000, image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&h=400&fit=crop', category: 'Case, Nguồn', brand: 'Corsair', qty: 18, desc: 'Nguồn Corsair RM1000x 1000W 80+ Gold, Full Modular, quạt Zero RPM' },
    { name: 'Seasonic Prime TX-1000 1000W 80+ Titanium', price: 7990000, oldPrice: null, image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&h=400&fit=crop', category: 'Case, Nguồn', brand: 'Seasonic', qty: 8, desc: 'Nguồn Seasonic Prime TX-1000 1000W 80+ Titanium, hiệu suất cao nhất' }
];

async function addGamingProducts() {
    console.log('🎮 Bắt đầu thêm sản phẩm Gaming vào CSDL...\n');
    
    try {
        // 1. Kiểm tra và thêm các danh mục mới nếu chưa có
        const newCategories = ['PC Gaming', 'Màn hình', 'CPU, VGA', 'Case, Nguồn'];
        
        for (const catName of newCategories) {
            const [existing] = await db.query('SELECT ma_danh_muc FROM danh_muc_san_pham WHERE ten_danh_muc = ?', [catName]);
            if (existing.length === 0) {
                await db.query('INSERT INTO danh_muc_san_pham (ten_danh_muc, mo_ta) VALUES (?, ?)', 
                    [catName, `Danh mục ${catName}`]);
                console.log(`✅ Đã thêm danh mục: ${catName}`);
            }
        }
        
        // 2. Lấy mapping danh mục
        const [categories] = await db.query('SELECT ma_danh_muc, ten_danh_muc FROM danh_muc_san_pham');
        const categoryMap = {};
        categories.forEach(c => {
            categoryMap[c.ten_danh_muc] = c.ma_danh_muc;
        });
        console.log('\n📂 Danh mục:', Object.keys(categoryMap).join(', '));
        
        let added = 0;
        let updated = 0;
        
        for (const product of gamingProducts) {
            const categoryId = categoryMap[product.category];
            if (!categoryId) {
                console.log(`⚠️ Không tìm thấy danh mục: ${product.category}`);
                continue;
            }
            
            // Kiểm tra sản phẩm đã tồn tại chưa
            const [existing] = await db.query(
                'SELECT ma_san_pham FROM san_pham WHERE ten_san_pham = ?',
                [product.name]
            );
            
            if (existing.length > 0) {
                // Cập nhật sản phẩm
                const productId = existing[0].ma_san_pham;
                await db.query(`
                    UPDATE san_pham SET 
                        mo_ta = ?, gia = ?, so_luong = ?, thuong_hieu = ?, ma_danh_muc = ?, trang_thai = 'hien_thi'
                    WHERE ma_san_pham = ?
                `, [product.desc, product.price, product.qty, product.brand, categoryId, productId]);
                
                // Cập nhật hình ảnh
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
                `, [product.name, product.desc, product.price, product.qty, product.brand, categoryId]);
                
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
        console.log(`   Tổng: ${added + updated} sản phẩm Gaming`);
        console.log('========================================\n');
        
        // Hiển thị tổng số sản phẩm theo danh mục
        const [stats] = await db.query(`
            SELECT dm.ten_danh_muc, COUNT(sp.ma_san_pham) as so_san_pham
            FROM danh_muc_san_pham dm
            LEFT JOIN san_pham sp ON dm.ma_danh_muc = sp.ma_danh_muc AND sp.trang_thai = 'hien_thi'
            GROUP BY dm.ma_danh_muc, dm.ten_danh_muc
            ORDER BY dm.ten_danh_muc
        `);
        
        console.log('📋 THỐNG KÊ SẢN PHẨM THEO DANH MỤC:');
        console.log('----------------------------------------');
        stats.forEach(s => {
            console.log(`   📁 ${s.ten_danh_muc}: ${s.so_san_pham} sản phẩm`);
        });
        
        // Tổng số sản phẩm
        const [total] = await db.query('SELECT COUNT(*) as total FROM san_pham WHERE trang_thai = "hien_thi"');
        console.log(`\n🎯 TỔNG SỐ SẢN PHẨM: ${total[0].total}`);
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

addGamingProducts();
