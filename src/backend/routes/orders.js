const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { calculateShippingFee, saveShippingHistory } = require('../utils/shipping');

/**
 * ==========================================
 * TẠO ĐƠN HÀNG MỚI VỚI TÍNH PHÍ SHIP TỰ ĐỘNG
 * ==========================================
 */
router.post('/create', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const {
            ma_nguoi_dung,
            dia_chi_giao_hang,
            tinh_thanh,
            quan_huyen,
            phuong_xa,
            so_dien_thoai,
            email,
            ghi_chu,
            phuong_thuc_thanh_toan,
            items,                    // Array of { ma_san_pham, so_luong }
            special_fees = []         // Array of special fee codes ['FRAGILE', 'COD', ...]
        } = req.body;
        
        // Validate
        if (!ma_nguoi_dung || !dia_chi_giao_hang || !items || items.length === 0) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin đơn hàng' 
            });
        }
        
        // BƯỚC 1: Tính tổng giá trị và trọng lượng đơn hàng
        let tongGiaTri = 0;
        let tongTrongLuong = 0;
        const productDetails = [];
        
        for (const item of items) {
            const [products] = await connection.query(
                'SELECT ma_san_pham, ten_san_pham, gia_ban, trong_luong_kg FROM san_pham WHERE ma_san_pham = ?',
                [item.ma_san_pham]
            );
            
            if (products.length === 0) {
                await connection.rollback();
                return res.status(404).json({ 
                    success: false, 
                    message: `Không tìm thấy sản phẩm ${item.ma_san_pham}` 
                });
            }
            
            const product = products[0];
            const soLuong = parseInt(item.so_luong);
            const giaBan = parseFloat(product.gia_ban);
            const trongLuong = parseFloat(product.trong_luong_kg) || 0.5;
            
            tongGiaTri += giaBan * soLuong;
            tongTrongLuong += trongLuong * soLuong;
            
            productDetails.push({
                ...product,
                so_luong: soLuong,
                thanh_tien: giaBan * soLuong
            });
        }
        
        // BƯỚC 2: Tính phí ship
        const fullAddress = `${dia_chi_giao_hang}, ${phuong_xa}, ${quan_huyen}, ${tinh_thanh}`;
        
        const shippingResult = await calculateShippingFee({
            customerAddress: fullAddress,
            customerProvince: tinh_thanh,
            totalWeight: tongTrongLuong,
            orderValue: tongGiaTri,
            specialFees: special_fees
        });
        
        const phiVanChuyen = shippingResult.final_fee;
        const tongTien = tongGiaTri + phiVanChuyen;
        
        // BƯỚC 3: Tạo đơn hàng
        const [orderResult] = await connection.query(`
            INSERT INTO don_dat_hang 
            (ma_nguoi_dung, dia_chi_giao_hang, tinh_thanh, quan_huyen, phuong_xa,
             so_dien_thoai, email, ghi_chu, tong_tien, phi_van_chuyen, khoang_cach_km,
             trong_luong_tong_kg, phi_co_ban, phi_vuot_trong, giam_gia_phi_ship,
             phan_tram_giam_ship, ten_vung_ship, trang_thai, trang_thai_thanh_toan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cho_xac_nhan', 'chua_thanh_toan')
        `, [
            ma_nguoi_dung,
            dia_chi_giao_hang,
            tinh_thanh,
            quan_huyen,
            phuong_xa,
            so_dien_thoai,
            email,
            ghi_chu,
            tongTien,
            phiVanChuyen,
            shippingResult.distance_km,
            tongTrongLuong,
            shippingResult.base_fee,
            shippingResult.weight_fee,
            shippingResult.discount_amount,
            shippingResult.discount_percent,
            shippingResult.zone_name
        ]);
        
        const maDonHang = orderResult.insertId;
        
        // BƯỚC 4: Thêm chi tiết đơn hàng
        for (const product of productDetails) {
            await connection.query(`
                INSERT INTO chi_tiet_don_hang 
                (ma_don_hang, ma_san_pham, so_luong, gia_ban, thanh_tien)
                VALUES (?, ?, ?, ?, ?)
            `, [
                maDonHang,
                product.ma_san_pham,
                product.so_luong,
                product.gia_ban,
                product.thanh_tien
            ]);
        }
        
        // BƯỚC 5: Thêm phí đặc biệt (nếu có)
        if (special_fees.length > 0) {
            const [fees] = await connection.query(`
                SELECT * FROM phi_dac_biet 
                WHERE ma_phi IN (?) AND trang_thai = 'active'
            `, [special_fees]);
            
            for (const fee of fees) {
                let feeValue = parseFloat(fee.gia_tri);
                if (fee.loai_gia_tri === 'percent') {
                    feeValue = shippingResult.base_fee * (feeValue / 100);
                }
                
                await connection.query(`
                    INSERT INTO don_hang_phi_dac_biet 
                    (ma_don_hang, ma_phi, gia_tri_ap_dung)
                    VALUES (?, ?, ?)
                `, [maDonHang, fee.ma_phi, feeValue]);
            }
        }
        
        // BƯỚC 6: Tạo bản ghi thanh toán
        await connection.query(`
            INSERT INTO thanh_toan 
            (ma_don_hang, phuong_thuc, so_tien, trang_thai)
            VALUES (?, ?, ?, 'cho_thanh_toan')
        `, [maDonHang, phuong_thuc_thanh_toan, tongTien]);
        
        // BƯỚC 7: Lưu lịch sử tính phí ship
        await saveShippingHistory(maDonHang, {
            customerAddress: fullAddress,
            distance_km: shippingResult.distance_km,
            zone_name: shippingResult.zone_name,
            base_fee: shippingResult.base_fee,
            total_weight_kg: tongTrongLuong,
            weight_fee: shippingResult.weight_fee,
            orderValue: tongGiaTri,
            discount_percent: shippingResult.discount_percent,
            discount_amount: shippingResult.discount_amount,
            final_fee: phiVanChuyen
        });
        
        await connection.commit();
        
        // Ghi nhận hành vi ĐẶT HÀNG (cart_checkout) — chưa phải purchase thực sự
        // purchase thực sự sẽ được ghi khi admin cập nhật đơn sang 'hoan_thanh'
        try {
            const RecommendationEngine = require('../utils/recommendationEngineJS');
            for (const item of productDetails) {
                await RecommendationEngine.trackUserAction(ma_nguoi_dung, item.ma_san_pham, 'cart_checkout', 3);
            }
            console.log(`🛒 [Recommendation] Tracked cart_checkout for User ${ma_nguoi_dung} on ${productDetails.length} items`);
        } catch (trackError) {
            console.error('❌ Lỗi ghi nhận hành vi đặt hàng:', trackError);
        }
        
        res.json({
            success: true,
            message: 'Tạo đơn hàng thành công',
            data: {
                ma_don_hang: maDonHang,
                tong_gia_tri: tongGiaTri,
                phi_van_chuyen: phiVanChuyen,
                tong_tien: tongTien,
                shipping_details: shippingResult
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi tạo đơn hàng',
            error: error.message 
        });
    } finally {
        connection.release();
    }
});

/**
 * ==========================================
 * LẤY CHI TIẾT ĐƠN HÀNG
 * ==========================================
 */
router.get('/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Lấy thông tin đơn hàng
        const [orders] = await db.query(`
            SELECT dh.*, nd.ten_nguoi_dung, nd.email as user_email
            FROM don_dat_hang dh
            LEFT JOIN nguoi_dung nd ON dh.ma_nguoi_dung = nd.ma_nguoi_dung
            WHERE dh.ma_don_hang = ?
        `, [orderId]);
        
        if (orders.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }
        
        const order = orders[0];
        
        // Lấy chi tiết sản phẩm
        const [items] = await db.query(`
            SELECT ct.*, sp.ten_san_pham, sp.hinh_anh
            FROM chi_tiet_don_hang ct
            JOIN san_pham sp ON ct.ma_san_pham = sp.ma_san_pham
            WHERE ct.ma_don_hang = ?
        `, [orderId]);
        
        // Lấy phí đặc biệt
        const [specialFees] = await db.query(`
            SELECT dhpdb.*, pdb.ten_phi, pdb.ma_phi
            FROM don_hang_phi_dac_biet dhpdb
            JOIN phi_dac_biet pdb ON dhpdb.ma_phi = pdb.ma_phi
            WHERE dhpdb.ma_don_hang = ?
        `, [orderId]);
        
        res.json({
            success: true,
            data: {
                ...order,
                items: items,
                special_fees: specialFees
            }
        });
        
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy thông tin đơn hàng' 
        });
    }
});

/**
 * ==========================================
 * CẬP NHẬT ĐỊA CHỈ VÀ TÍNH LẠI PHÍ SHIP
 * ==========================================
 */
router.put('/:orderId/update-address', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { orderId } = req.params;
        const {
            dia_chi_giao_hang,
            tinh_thanh,
            quan_huyen,
            phuong_xa,
            special_fees = []
        } = req.body;
        
        // Lấy thông tin đơn hàng hiện tại
        const [orders] = await connection.query(
            'SELECT * FROM don_dat_hang WHERE ma_don_hang = ?',
            [orderId]
        );
        
        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }
        
        const order = orders[0];
        const tongGiaTri = parseFloat(order.tong_tien) - parseFloat(order.phi_van_chuyen);
        const tongTrongLuong = parseFloat(order.trong_luong_tong_kg) || 0;
        
        // Tính lại phí ship
        const fullAddress = `${dia_chi_giao_hang}, ${phuong_xa}, ${quan_huyen}, ${tinh_thanh}`;
        
        const shippingResult = await calculateShippingFee({
            customerAddress: fullAddress,
            customerProvince: tinh_thanh,
            totalWeight: tongTrongLuong,
            orderValue: tongGiaTri,
            specialFees: special_fees
        });
        
        const phiVanChuyen = shippingResult.final_fee;
        const tongTienMoi = tongGiaTri + phiVanChuyen;
        
        // Cập nhật đơn hàng
        await connection.query(`
            UPDATE don_dat_hang 
            SET dia_chi_giao_hang = ?,
                tinh_thanh = ?,
                quan_huyen = ?,
                phuong_xa = ?,
                phi_van_chuyen = ?,
                khoang_cach_km = ?,
                phi_co_ban = ?,
                phi_vuot_trong = ?,
                giam_gia_phi_ship = ?,
                phan_tram_giam_ship = ?,
                ten_vung_ship = ?,
                tong_tien = ?
            WHERE ma_don_hang = ?
        `, [
            dia_chi_giao_hang,
            tinh_thanh,
            quan_huyen,
            phuong_xa,
            phiVanChuyen,
            shippingResult.distance_km,
            shippingResult.base_fee,
            shippingResult.weight_fee,
            shippingResult.discount_amount,
            shippingResult.discount_percent,
            shippingResult.zone_name,
            tongTienMoi,
            orderId
        ]);
        
        // Cập nhật phí đặc biệt
        await connection.query('DELETE FROM don_hang_phi_dac_biet WHERE ma_don_hang = ?', [orderId]);
        
        if (special_fees.length > 0) {
            const [fees] = await connection.query(`
                SELECT * FROM phi_dac_biet 
                WHERE ma_phi IN (?) AND trang_thai = 'active'
            `, [special_fees]);
            
            for (const fee of fees) {
                let feeValue = parseFloat(fee.gia_tri);
                if (fee.loai_gia_tri === 'percent') {
                    feeValue = shippingResult.base_fee * (feeValue / 100);
                }
                
                await connection.query(`
                    INSERT INTO don_hang_phi_dac_biet 
                    (ma_don_hang, ma_phi, gia_tri_ap_dung)
                    VALUES (?, ?, ?)
                `, [orderId, fee.ma_phi, feeValue]);
            }
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Cập nhật địa chỉ và phí ship thành công',
            data: {
                phi_van_chuyen_cu: order.phi_van_chuyen,
                phi_van_chuyen_moi: phiVanChuyen,
                tong_tien_moi: tongTienMoi,
                shipping_details: shippingResult
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Update address error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi cập nhật địa chỉ',
            error: error.message 
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
