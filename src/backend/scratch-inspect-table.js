const db = require('./config/database');

async function test() {
    try {
        const [columns] = await db.query('DESCRIBE lich_su_chatbot');
        console.log('Columns of lich_su_chatbot:', columns);
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

test();
