const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/database');
const { momoConfig, createSignature, generateRequestId, generateOrderId } = require('../config/momo');
const { calculateShipping } = require('../utils/shipping');

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Payment routes loaded - Version 2.0',
        timestamp: new Date().toISOString(),
        simulationAvailable: true
    });
});

// ==========================================
// Táº O THANH TOÃ N MOMO
// ==========================================
router.post('/momo/create', async (req, res) => {
    try {
        const { orderId, amount, orderInfo, useSimulation, useTestMode, requestType } = req.body;
        
        console.log('ðŸ“¥ MoMo Create Request:', { orderId, amount, orderInfo, useSimulation, useTestMode, requestType });

        if (!orderId || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiáº¿u thÃ´ng tin Ä‘Æ¡n hÃ ng' 
            });
        }

        const requestId = generateRequestId();
        const momoOrderId = generateOrderId(orderId);
        
        // Loáº¡i bá»  kÃ½ tá»± Ä‘áº·c biá»‡t trong orderInfo
        const orderInfoText = (orderInfo || `Thanh toan don hang ${orderId}`).replace(/[^\w\s]/gi, ' ');
        const extraData = ''; // Base64 encoded JSON náº¿u cáº§n

        let paymentAmount = parseInt(amount);
        
        // Kiá»ƒm tra giá»›i háº¡n sá»‘ tiá» n MoMo sandbox: 1,000 - 50,000,000
        if (paymentAmount < 1000) {
            return res.status(400).json({ 
                success: false, 
                message: 'Sá»‘ tiá» n thanh toÃ¡n tá»‘i thiá»ƒu lÃ  1,000Ä‘' 
            });
        }
        if (paymentAmount > 50000000) {
            return res.status(400).json({ 
                success: false, 
                message: 'Sá»‘ tiá» n thanh toÃ¡n tá»‘i Ä‘a lÃ  50,000,000Ä‘ cho mÃ´i trÆ°á» ng test' 
            });
        }
        
        // CHáº¾ Ä á»˜ TEST MODE - Tá»± Ä‘á»™ng thanh toÃ¡n thÃ nh cÃ´ng sau 3 giÃ¢y
        if (useTestMode) {
            console.log('ðŸ§ª Using TEST MODE - Auto success after 3 seconds');
            
            // LÆ°u thÃ´ng tin Ä‘á»ƒ xá»­ lÃ½ sau
            setTimeout(async () => {
                try {
                    const transId = `TEST_${Date.now()}`;
                    
                    // Cáº­p nháº­t Ä‘Æ¡n hÃ ng
                    await db.query(`
                        UPDATE don_hang 
                        SET trang_thai_thanh_toan = 'da_thanh_toan'
                        WHERE ma_don_hang = ?
                    `, [orderId]);

                    await db.query(`
                        UPDATE thanh_toan 
                        SET ma_giao_dich = ?
                        WHERE ma_don_hang = ?
                    `, [transId, orderId]);
                    
                    console.log('âœ… TEST MODE: Payment auto-completed for order:', orderId);
                } catch (err) {
                    console.error('â Œ TEST MODE error:', err);
                }
            }, 3000);
            
            return res.json({
                success: true,
                testMode: true,
                data: {
                    payUrl: `http://localhost:3000/user/pages/payment-result.html?status=success&orderId=${orderId}&transId=TEST_${Date.now()}&testMode=true`,
                    orderId: momoOrderId,
                    requestId: requestId,
                    message: 'Cháº¿ Ä‘á»™ test - Thanh toÃ¡n sáº½ tá»± Ä‘á»™ng thÃ nh cÃ´ng sau 3 giÃ¢y'
                }
            });
        }
        
        // Nếu sử dụng simulation mode (cho localhost testing) hoặc bật cấu hình trong .env
        const shouldSimulate = useSimulation || process.env.MOMO_USE_SIMULATION === 'true';
        if (shouldSimulate) {
            console.log('🎮 Using Simulation Mode for localhost testing');
            
            // Táº¡o URL giáº£ láº­p
            const simulationUrl = `http://localhost:3000/user/pages/momo-sandbox.html?orderId=${momoOrderId}&amount=${paymentAmount}&orderInfo=${encodeURIComponent(orderInfoText)}`;
            
            return res.json({
                success: true,
                simulation: true,
                data: {
                    payUrl: simulationUrl,
                    orderId: momoOrderId,
                    requestId: requestId,
                    message: 'Ä ang sá»­ dá»¥ng cháº¿ Ä‘á»™ giáº£ láº­p cho localhost'
                }
            });
        }
        
        // TÃ¡ÂºÂ¡o raw signature theo format MoMo yÃƒÂªu cÃ¡ÂºÂ§u (theo thÃ¡Â»Â© tÃ¡Â»Â± alphabet)
        const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${paymentAmount}&extraData=${extraData}&ipnUrl=${momoConfig.ipnUrl}&orderId=${momoOrderId}&orderInfo=${orderInfoText}&partnerCode=${momoConfig.partnerCode}&redirectUrl=${momoConfig.redirectUrl}&requestId=${requestId}&requestType=${requestType || momoConfig.requestType}`;

        console.log('ðŸŸ¢ Raw Signature:', rawSignature);
        console.log('ðŸ”‘ Secret Key:', momoConfig.secretKey);
        console.log('ðŸ’³ Request Type:', requestType || momoConfig.requestType);
        
        const signature = createSignature(rawSignature);
        console.log('ðŸ”  Generated Signature:', signature);

        // Request body gÃ¡Â»i Ã„â€˜Ã¡ÂºÂ¿n MoMo (API v2)
        const requestBody = {
            partnerCode: momoConfig.partnerCode,
            requestId: requestId,
            amount: paymentAmount, // Ä áº£m báº£o sá»‘ tiá» n náº±m trong giá»›i háº¡n cho phÃ©p
            orderId: momoOrderId,
            orderInfo: orderInfoText,
            redirectUrl: momoConfig.redirectUrl,
            ipnUrl: momoConfig.ipnUrl,
            requestType: requestType || momoConfig.requestType,
            extraData: extraData,
            lang: 'vi',
            signature: signature
        };

        console.log('ðŸ”µ MoMo Request:', JSON.stringify(requestBody, null, 2));

        // Gá» i API MoMo
        const response = await axios.post(momoConfig.endpoint, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('ðŸŸ¢ MoMo Response:', JSON.stringify(response.data, null, 2));

        if (response.data.resultCode === 0) {
            // LÆ°u thÃ´ng tin giao dá»‹ch vÃ o database (náº¿u cÃ³ báº£n ghi thanh_toan)
            try {
                await db.query(`
                    UPDATE thanh_toan 
                    SET ma_giao_dich = ?
                    WHERE ma_don_hang = ?
                `, [momoOrderId, orderId]);
            } catch (dbErr) {
                console.log('âš ï¸  KhÃ´ng tÃ¬m tháº¥y báº£n ghi thanh_toan Ä‘á»ƒ cáº­p nháº­t (cÃ³ thá»ƒ chÆ°a Ä‘Æ°á»£c táº¡o)');
            }

            res.json({
                success: true,
                data: {
                    payUrl: response.data.payUrl,
                    deeplink: response.data.deeplink,
                    qrCodeUrl: response.data.qrCodeUrl,
                    orderId: momoOrderId,
                    requestId: requestId
                }
            });
        } else {
            // Log chi tiáº¿t lá»—i tá»« MoMo
            console.error('â Œ MoMo Error Response:', {
                resultCode: response.data.resultCode,
                message: response.data.message,
                localMessage: response.data.localMessage
            });
            
            res.status(400).json({
                success: false,
                message: response.data.localMessage || response.data.message || 'KhÃ´ng thá»ƒ táº¡o thanh toÃ¡n MoMo',
                resultCode: response.data.resultCode,
                details: response.data
            });
        }

    } catch (error) {
        console.error('â Œ MoMo Create Error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Lá»—i káº¿t ná»‘i Ä‘áº¿n MoMo',
            error: error.response?.data || error.message
        });
    }
});

// ==========================================
// CALLBACK Tá»ª MOMO (Redirect URL)
// ==========================================
router.get('/momo/callback', async (req, res) => {
    try {
        console.log('ðŸ”µ MoMo Callback:', req.query);

        const { 
            partnerCode, orderId, requestId, amount, 
            orderInfo, orderType, transId, resultCode, 
            message, payType, responseTime, extraData, signature 
        } = req.query;

        // Verify signature
        const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=${extraData || ''}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
        
        const expectedSignature = createSignature(rawSignature);

        if (signature !== expectedSignature) {
            console.error('â Œ Invalid signature');
            return res.redirect(`/user/pages/payment-result.html?status=error&message=Invalid signature`);
        }

        // Láº¥y orderId gá»‘c tá»« momoOrderId (format: YNT{orderId}_{timestamp})
        const originalOrderId = orderId.split('_')[0].replace('YNT', '');

        if (resultCode === '0') {
            // Thanh toÃ¡n thÃ nh cÃ´ng
            await db.query(`
                UPDATE don_hang 
                SET trang_thai_thanh_toan = 'da_thanh_toan'
                WHERE ma_don_hang = ?
            `, [originalOrderId]);

            await db.query(`
                UPDATE thanh_toan 
                SET ma_giao_dich = ?
                WHERE ma_don_hang = ?
            `, [transId, originalOrderId]);

            console.log('âœ… Payment success for order:', originalOrderId);
            
            // Redirect vá»  trang káº¿t quáº£ thanh toÃ¡n
            res.redirect(`/user/pages/payment-result.html?status=success&orderId=${originalOrderId}&transId=${transId}`);
        } else {
            // Thanh toÃ¡n tháº¥t báº¡i
            await db.query(`
                UPDATE thanh_toan 
                SET ma_giao_dich = 'da_huy'
                WHERE ma_don_hang = ?
            `, [originalOrderId]);

            console.log('â Œ Payment failed for order:', originalOrderId, 'Message:', message);
            
            res.redirect(`/user/pages/payment-result.html?status=failed&orderId=${originalOrderId}&message=${encodeURIComponent(message)}`);
        }

    } catch (error) {
        console.error('â Œ MoMo Callback Error:', error);
        res.redirect(`/user/pages/payment-result.html?status=error&message=${encodeURIComponent('Lá»—i xá»­ lÃ½ thanh toÃ¡n')}`);
    }
});

// ==========================================
// IPN (Instant Payment Notification) tá»« MoMo
// ==========================================
router.post('/momo/ipn', async (req, res) => {
    try {
        console.log('ðŸ”µ MoMo IPN:', req.body);

        const { 
            partnerCode, orderId, requestId, amount, 
            orderInfo, orderType, transId, resultCode, 
            message, payType, responseTime, extraData, signature 
        } = req.body;

        // Verify signature
        const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=${extraData || ''}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
        
        const expectedSignature = createSignature(rawSignature);

        if (signature !== expectedSignature) {
            console.error('â Œ IPN Invalid signature');
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        // Láº¥y orderId gá»‘c
        const originalOrderId = orderId.split('_')[0].replace('YNT', '');

        if (resultCode === 0) {
            // Cáº­p nháº­t tráº¡ng thÃ¡i thanh toÃ¡n
            await db.query(`
                UPDATE don_hang 
                SET trang_thai_thanh_toan = 'da_thanh_toan'
                WHERE ma_don_hang = ?
            `, [originalOrderId]);

            await db.query(`
                UPDATE thanh_toan 
                SET ma_giao_dich = ?
                WHERE ma_don_hang = ?
            `, [transId, originalOrderId]);

            console.log('âœ… IPN: Payment confirmed for order:', originalOrderId);
        }

        // Tráº£ vá»  response cho MoMo
        res.status(204).send();

    } catch (error) {
        console.error('â Œ MoMo IPN Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==========================================
// KIá»‚M TRA TRáº NG THÃ I THANH TOÃ N
// ==========================================
router.get('/momo/status/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        const [payments] = await db.query(`
            SELECT tt.*, dh.trang_thai_thanh_toan
            FROM thanh_toan tt
            JOIN don_hang dh ON tt.ma_don_hang = dh.ma_don_hang
            WHERE tt.ma_don_hang = ?
        `, [orderId]);

        if (payments.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin thanh toÃ¡n' 
            });
        }

        res.json({
            success: true,
            data: payments[0]
        });

    } catch (error) {
        console.error('Check payment status error:', error);
        res.status(500).json({ success: false, message: 'Lá»—i server' });
    }
});

// ==========================================
// THANH TOÃ N GIáº¢ Láº¬P (SANDBOX)
// ==========================================
router.post('/momo/simulate', async (req, res) => {
    try {
        const { orderId, result, amount } = req.body;

        if (!orderId || !result) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiáº¿u thÃ´ng tin' 
            });
        }

        // Láº¥y orderId gá»‘c tá»« momoOrderId (format: YNT{orderId}_{timestamp})
        const originalOrderId = orderId.split('_')[0].replace('YNT', '');
        const transId = `SANDBOX_${Date.now()}`;

        console.log(`ðŸŽ® Sandbox Payment - Order: ${originalOrderId}, Result: ${result}`);

        if (result === 'success') {
            // Cáº­p nháº­t Ä‘Æ¡n hÃ ng - thanh toÃ¡n thÃ nh cÃ´ng
            await db.query(`
                UPDATE don_hang 
                SET trang_thai_thanh_toan = 'da_thanh_toan'
                WHERE ma_don_hang = ?
            `, [originalOrderId]);

            // Cáº­p nháº­t báº£ng thanh_toan
            await db.query(`
                UPDATE thanh_toan 
                SET ma_giao_dich = ?
                WHERE ma_don_hang = ?
            `, [transId, originalOrderId]);

            console.log('âœ… Sandbox: Payment SUCCESS for order:', originalOrderId);

            res.json({
                success: true,
                message: 'Thanh toÃ¡n giáº£ láº­p thÃ nh cÃ´ng',
                data: {
                    orderId: originalOrderId,
                    transId: transId,
                    status: 'success'
                }
            });
        } else {
            // Cáº­p nháº­t thanh toÃ¡n tháº¥t báº¡i
            await db.query(`
                UPDATE thanh_toan 
                SET ma_giao_dich = 'da_huy'
                WHERE ma_don_hang = ?
            `, [originalOrderId]);

            console.log('â Œ Sandbox: Payment FAILED for order:', originalOrderId);

            res.json({
                success: true,
                message: 'Thanh toÃ¡n giáº£ láº­p tháº¥t báº¡i',
                data: {
                    orderId: originalOrderId,
                    status: 'failed'
                }
            });
        }

    } catch (error) {
        console.error('â Œ Sandbox Payment Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lá»—i xá»­ lÃ½ thanh toÃ¡n giáº£ láº­p',
            error: error.message
        });
    }
});


// ==========================================
// TÍNH PHÍ VẬN CHUYỂN DỰA TRÊN QUÃNG ĐƯỜNG VÀ GIÁ TRỊ ĐƠN HÀNG
// ==========================================
router.post('/calculate-shipping', async (req, res) => {
    try {
        const { dia_chi_giao_hang, order_value } = req.body;
        
        if (!dia_chi_giao_hang) {
            return res.status(400).json({ success: false, message: 'Thiếu địa chỉ giao hàng' });
        }

        const orderValue = parseFloat(order_value) || 0;
        const result = await calculateShipping(dia_chi_giao_hang, orderValue);

        res.json({
            success: true,
            distance_km: result.distance_km,
            shipping_fee: result.shipping_fee,
            base_fee: result.base_fee,
            zone: result.zone,
            is_fallback: result.is_fallback,
            discount_info: getShippingDiscountInfo(orderValue),
            message: 'Tính phí vận chuyển thành công'
        });

    } catch (error) {
        console.error('Lỗi tính phí ship:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tính phí ship' });
    }
});

// Helper function để trả về thông tin giảm giá
function getShippingDiscountInfo(orderValue) {
    if (orderValue >= 2000000) {
        return { discount: 100, message: 'Miễn phí ship cho đơn hàng trên 2 triệu' };
    } else if (orderValue >= 1000000) {
        return { discount: 50, message: 'Giảm 50% phí ship cho đơn hàng từ 1-2 triệu' };
    } else if (orderValue >= 500000) {
        return { discount: 30, message: 'Giảm 30% phí ship cho đơn hàng từ 500k-1 triệu' };
    }
    return { discount: 0, message: 'Phí ship tiêu chuẩn' };
}
module.exports = router;
