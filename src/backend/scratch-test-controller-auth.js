const dotenv = require('dotenv');
dotenv.config();

const jwt = require('jsonwebtoken');
const chatbotController = require('./controllers/chatbotController');

const SYSTEM_PROMPT = `Bạn là trợ lý ảo của cửa hàng công nghệ "Yến Nhi Tech". Hãy trả lời ngắn gọn, thân thiện và hữu ích bằng tiếng Việt.`;

// Create a valid JWT token for a user (e.g., ma_tai_khoan: 13)
const token = jwt.sign(
    { ma_tai_khoan: 13, vai_tro: 'khach_hang' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
);

const mockReq = {
    body: {
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: 'tìm iphone' }
        ]
    },
    headers: {
        'authorization': `Bearer ${token}`
    }
};

const mockRes = {
    status: function(code) {
        console.log('Response Status:', code);
        return this;
    },
    json: function(data) {
        console.log('Response JSON:', JSON.stringify(data, null, 2));
        return this;
    }
};

async function run() {
    console.log('Invoking chatbotController.chat with authenticated user...');
    await chatbotController.chat(mockReq, mockRes);
}

run().then(() => {
    setTimeout(() => process.exit(0), 3000);
});
