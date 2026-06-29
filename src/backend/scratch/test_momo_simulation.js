const axios = require('axios');

async function testMomoSimulation() {
    try {
        console.log('Sending MoMo payment creation request...');
        const response = await axios.post('http://localhost:3000/api/payment/momo/create', {
            orderId: '10012',
            amount: 74000,
            orderInfo: 'Thanh toán đơn hàng #10012'
        });

        console.log('\nResponse status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));

        if (response.data.success && response.data.data.payUrl.includes('momo-sandbox.html')) {
            console.log('\n✅ TEST PASSED: MoMo payment simulation URL was generated correctly!');
            console.log('Generated Pay URL:', response.data.data.payUrl);
        } else {
            console.log('\n❌ TEST FAILED: Response data was not as expected.', response.data);
        }
    } catch (error) {
        console.error('\n❌ ERROR connecting to server:', error.response?.data || error.message);
    }
}

testMomoSimulation();
