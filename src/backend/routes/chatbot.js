const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

const path = require('path');
const fs = require('fs');

router.post('/chat', chatbotController.chat);

router.get('/policy', (req, res) => {
    try {
        const filePath = path.join(__dirname, '../data/documents/chinh_sach_cua_hang.md');
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.json({ success: true, content });
        } else {
            res.status(404).json({ success: false, message: 'Policy document not found' });
        }
    } catch (error) {
        console.error('Get public policy error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
