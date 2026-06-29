const crypto = require('crypto');
require('dotenv').config();

const momoConfig = {
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
    accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
    secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
    redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/api/payment/momo/callback',
    ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:3000/api/payment/momo/ipn',
    requestType: 'payWithATM'
};

function createSignature(rawSignature) {
    return crypto.createHmac('sha256', momoConfig.secretKey)
        .update(rawSignature)
        .digest('hex');
}

function generateRequestId() {
    return momoConfig.partnerCode + Date.now();
}

function generateOrderId(orderId) {
    return `YNT${orderId}_${Date.now()}`;
}

module.exports = {
    momoConfig,
    createSignature,
    generateRequestId,
    generateOrderId
};