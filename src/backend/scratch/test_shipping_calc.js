const http = require('http');

function post(url, payload) {
    return new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(payload);
        const req = http.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error("Failed to parse JSON: " + data.substring(0, 100)));
                }
            });
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
    });
}

async function verify() {
    try {
        console.log('--- TEST 1: NZXT H9 Elite (8.5kg) under 2M threshold ---');
        // We expect base fee + weight surcharge
        const res1 = await post('http://localhost:3000/api/shipping-config/calculate', {
            weight: 8.5,
            orderValue: 500000, // < 2M
            address: 'Bắc Ninh, Việt Nam'
        });
        console.log('Result 1:', JSON.stringify(res1, null, 2));

        console.log('\n--- TEST 2: NZXT H9 Elite (8.5kg) over 2M threshold ---');
        // We expect free shipping (0đ)
        const res2 = await post('http://localhost:3000/api/shipping-config/calculate', {
            weight: 8.5,
            orderValue: 2500000, // >= 2M
            address: 'Bắc Ninh, Việt Nam'
        });
        console.log('Result 2:', JSON.stringify(res2, null, 2));
    } catch (err) {
        console.error('Error during verification:', err);
    }
}

verify();
