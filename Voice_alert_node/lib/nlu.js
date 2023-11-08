const axios = require('axios');

async function text_analysis(text) {
    try {
        const response = await fetch('http://127.0.0.1:5000//predict_emotion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        
        return {
            emotion: data.emotion,
            probabilities: data.probabilities
        };
    } catch (error) {
        console.error('Error getting emotion:', error);
        return null;
    }
}


module.exports = { text_analysis };

