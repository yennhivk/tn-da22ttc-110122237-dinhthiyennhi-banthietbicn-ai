const dotenv = require('dotenv');
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function listModels() {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${GROQ_API_KEY}`
            }
        });

        console.log('Response Status:', response.status);
        const data = await response.json();
        console.log('Models:', data.data.map(m => m.id));
    } catch (e) {
        console.error('Exception:', e);
    }
}

listModels();
