-- =========================================
-- CẬP NHẬT HÌNH ẢNH SẢN PHẨM TỪ DANH MỤC MỞ RỘNG
-- =========================================

USE CSDL_DoAnCN;

-- =========================================
-- 1. ĐIỆN THOẠI
-- =========================================

-- iPhone 15 Pro Max
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%iPhone 15 Pro Max%' AND asp.la_anh_chinh = 1;

-- Samsung Galaxy S24 Ultra
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Samsung%S24%' AND asp.la_anh_chinh = 1;

-- Xiaomi 14 Pro
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Xiaomi 14%' AND asp.la_anh_chinh = 1;

-- OPPO Find X7
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%OPPO Find X7%' AND asp.la_anh_chinh = 1;

-- iPhone 14 Pro
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%iPhone 14 Pro%' AND asp.la_anh_chinh = 1;

-- Samsung S23 FE
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Samsung%S23%FE%' AND asp.la_anh_chinh = 1;

-- =========================================
-- 2. LAPTOP
-- =========================================

-- MacBook Pro M3
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%MacBook Pro M3%' AND asp.la_anh_chinh = 1;

-- MacBook Air M3
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%MacBook Air M3%' AND asp.la_anh_chinh = 1;

-- Dell XPS
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Dell XPS%' AND asp.la_anh_chinh = 1;

-- Asus ROG Zephyrus
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Asus ROG%' AND asp.la_anh_chinh = 1;

-- HP Spectre x360
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%HP Spectre%' AND asp.la_anh_chinh = 1;

-- Lenovo ThinkPad X1
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Lenovo ThinkPad%' AND asp.la_anh_chinh = 1;

-- MSI Creator Z16
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%MSI Creator%' AND asp.la_anh_chinh = 1;

-- =========================================
-- 3. ĐIỆN MÁY
-- =========================================

-- Tủ lạnh Samsung Inverter
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Tủ lạnh Samsung%' AND asp.la_anh_chinh = 1;

-- Máy giặt LG AI
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Máy giặt LG%' AND asp.la_anh_chinh = 1;

-- Tivi Sony 4K
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Tivi Sony%' AND asp.la_anh_chinh = 1;

-- Điều hòa Daikin Inverter
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Điều hòa Daikin%' AND asp.la_anh_chinh = 1;

-- Máy lọc không khí Sharp
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Máy lọc không khí Sharp%' AND asp.la_anh_chinh = 1;

-- Nồi cơm điện Toshiba
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Nồi cơm điện Toshiba%' AND asp.la_anh_chinh = 1;

-- =========================================
-- 4. PHỤ KIỆN
-- =========================================

-- AirPods Pro 2
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%AirPods Pro%' AND asp.la_anh_chinh = 1;

-- Apple Watch Series 9
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Apple Watch%' AND asp.la_anh_chinh = 1;

-- Bàn phím Logitech MX Keys
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Bàn phím Logitech MX Keys%' AND asp.la_anh_chinh = 1;

-- Chuột Logitech MX Master 3
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Chuột Logitech MX Master%' AND asp.la_anh_chinh = 1;

-- Tai nghe Sony WH-1000XM5
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Tai nghe Sony WH-1000XM5%' AND asp.la_anh_chinh = 1;

-- Webcam Logitech C920
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://m.media-amazon.com/images/I/71iNwni9TsL._AC_SL1500_.jpg'
WHERE sp.ten_san_pham LIKE '%Webcam Logitech C920%' AND asp.la_anh_chinh = 1;

-- Sạc nhanh 65W Anker
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Sạc nhanh%Anker%' AND asp.la_anh_chinh = 1;

-- =========================================
-- 5. SAMSUNG - SẢN PHẨM NỔI BẬT
-- =========================================

-- Galaxy Z Fold 5
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Galaxy Z Fold%' AND asp.la_anh_chinh = 1;

-- Galaxy Tab S9
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Galaxy Tab S9%' AND asp.la_anh_chinh = 1;

-- Galaxy Buds Pro
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Galaxy Buds Pro%' AND asp.la_anh_chinh = 1;

-- Galaxy Watch 6
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Galaxy Watch%' AND asp.la_anh_chinh = 1;

-- =========================================
-- 6. XIAOMI - SẢN PHẨM NỔI BẬT
-- =========================================

-- Redmi Note 13 Pro
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Redmi Note 13%' AND asp.la_anh_chinh = 1;

-- Xiaomi Pad 6
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Xiaomi Pad%' AND asp.la_anh_chinh = 1;

-- Mi Band 8
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Mi Band%' AND asp.la_anh_chinh = 1;

-- Redmi Buds 4 Pro
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Redmi Buds%' AND asp.la_anh_chinh = 1;

-- Xiaomi Smart TV 55"
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%Xiaomi Smart TV%' AND asp.la_anh_chinh = 1;

-- =========================================
-- 7. APPLE - SẢN PHẨM NỔI BẬT
-- =========================================

-- iPad Pro 2024
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%iPad Pro%' AND asp.la_anh_chinh = 1;

-- iMac 24" M3
UPDATE anh_san_pham asp
JOIN san_pham sp ON asp.ma_san_pham = sp.ma_san_pham
SET asp.duong_dan_anh = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=400&fit=crop'
WHERE sp.ten_san_pham LIKE '%iMac%' AND asp.la_anh_chinh = 1;

-- =========================================
-- KIỂM TRA KẾT QUẢ
-- =========================================
SELECT sp.ma_san_pham, sp.ten_san_pham, asp.duong_dan_anh 
FROM san_pham sp
LEFT JOIN anh_san_pham asp ON sp.ma_san_pham = asp.ma_san_pham AND asp.la_anh_chinh = 1
ORDER BY sp.ma_san_pham;
