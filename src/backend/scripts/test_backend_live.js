const http = require('http');

const req = http.request('http://localhost:3000/api/admin/suppliers', { method: 'GET' }, (res) => {
    console.log('STATUS:', res.statusCode);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error('❌ CONNECTION ERROR:', e.message);
});

req.end();
