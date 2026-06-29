const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function updateToSinglePOS() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'CSDL_DoAnCN',
            charset: 'utf8mb4'
        });

        console.log('✅ Kết nối database thành công!');

        // Xóa giao dịch của các máy POS thừa
        console.log('\n🗑️  Đang xóa giao dịch của các máy POS thừa...');
        await connection.query('DELETE FROM giao_dich_pos WHERE ma_pos IN (2, 3, 4)');
        
        // Xóa các máy POS thừa
        console.log('🗑️  Đang xóa các máy POS thừa...');
        await connection.query('DELETE FROM may_pos WHERE ma_pos IN (2, 3, 4)');
        
        // Cập nhật thông tin máy POS duy nhất
        console.log('📝 Đang cập nhật thông tin máy POS...');
        await connection.query(`
            UPDATE may_pos 
            SET ma_may = 'POS001',
                ten_may = 'Máy POS Yến Nhi Tech',
                vi_tri = '74-76 Lê Lợi, khóm 3, Trà Vinh',
                trang_thai = 'active',
                may_in = 'HP LaserJet P1102',
                cong_may_in = 'USB001',
                may_quet = 'Honeywell 1900',
                cong_may_quet = 'USB002',
                ghi_chu = 'Máy POS chính của cửa hàng Yến Nhi Tech'
            WHERE ma_pos = 1
        `);

        // Hiển thị kết quả
        const [machines] = await connection.query('SELECT * FROM may_pos');
        const [transactions] = await connection.query('SELECT COUNT(*) as count FROM giao_dich_pos');
        
        console.log('\n✅ Hoàn thành! Thông tin máy POS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        machines.forEach(machine => {
            console.log(`📟 Mã máy: ${machine.ma_may}`);
            console.log(`   Tên: ${machine.ten_may}`);
            console.log(`   Vị trí: ${machine.vi_tri}`);
            console.log(`   Trạng thái: ${machine.trang_thai}`);
            console.log(`   Máy in: ${machine.may_in} (${machine.cong_may_in})`);
            console.log(`   Máy quét: ${machine.may_quet} (${machine.cong_may_quet})`);
            console.log(`   Ghi chú: ${machine.ghi_chu}`);
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\n📊 Tổng số giao dịch: ${transactions[0].count}`);

    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Đã đóng kết nối database.');
        }
    }
}

updateToSinglePOS();
