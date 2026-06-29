// Script để xóa bớt sản phẩm trong đơn hàng #1 nếu cần
// Chạy: node scripts/fix-order-items.js

const mysql = require('mysql2/promise');

async function fixOrderItems() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'yennhi_tech'
    });

    try {
        console.log('📦 Kiểm tra chi tiết đơn hàng...\n');
        
        // Xem các đơn hàng và chi tiết
        const [orders] = await connection.query(`
            SELECT dh.ma_don_hang, dh.tong_tien, dh.ngay_tao, 
                   GROUP_CONCAT(sp.ten_san_pham SEPARATOR ', ') as san_pham,
                   COUNT(ctdh.ma_chi_tiet) as so_san_pham
            FROM don_hang dh
            LEFT JOIN chi_tiet_don_hang ctdh ON dh.ma_don_hang = ctdh.ma_don_hang
            LEFT JOIN san_pham sp ON ctdh.ma_san_pham = sp.ma_san_pham
            GROUP BY dh.ma_don_hang
        `);

        console.log('📋 Danh sách đơn hàng:');
        orders.forEach(o => {
            console.log(`  - Đơn #${o.ma_don_hang}: ${o.so_san_pham} sản phẩm - ${o.san_pham}`);
        });

        // Xem chi tiết đơn hàng #1
        console.log('\n📦 Chi tiết đơn hàng #1:');
        const [items] = await connection.query(`
            SELECT ctdh.*, sp.ten_san_pham 
            FROM chi_tiet_don_hang ctdh
            LEFT JOIN san_pham sp ON ctdh.ma_san_pham = sp.ma_san_pham
            WHERE ctdh.ma_don_hang = 1
        `);
        
        items.forEach(item => {
            console.log(`  - [ID: ${item.ma_chi_tiet}] ${item.ten_san_pham} x${item.so_luong} = ${Number(item.gia_ban).toLocaleString('vi-VN')}đ`);
        });

        // Nếu muốn xóa sản phẩm thừa (uncomment để chạy)
        /*
        console.log('\n🗑️ Xóa sản phẩm thứ 2 trong đơn hàng #1...');
        await connection.query('DELETE FROM chi_tiet_don_hang WHERE ma_chi_tiet = 2');
        
        // Cập nhật lại tổng tiền
        await connection.query(`
            UPDATE don_hang dh
            SET tong_tien = (
                SELECT SUM(gia_ban * so_luong) 
                FROM chi_tiet_don_hang 
                WHERE ma_don_hang = dh.ma_don_hang
            )
            WHERE ma_don_hang = 1
        `);
        console.log('✅ Đã xóa và cập nhật tổng tiền!');
        */

        console.log('\n✅ Hoàn thành kiểm tra!');
        console.log('\n💡 Nếu muốn xóa sản phẩm thừa, mở file này và uncomment phần xóa.');
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await connection.end();
    }
}

fixOrderItems();
