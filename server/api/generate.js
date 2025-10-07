// This is a Vercel-optimized serverless function.

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Vercel automatically makes environment variables available
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize GenAI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

module.exports = async (req, res) => {
    // FIX for 405 Method Not Allowed error: explicitly check for POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { topic, numQuestions } = req.body;

    if (!topic || !numQuestions) {
        return res.status(400).json({ error: 'Topic and numQuestions are required' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Generate a ${numQuestions} question quiz about ${topic}. This should be in a JSON array format. Each object in the array should have 'question', 'options' (an array of strings), and 'answer' (the correct option string). Do not include any text before or after the JSON.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Clean markdown fences if present
        let cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        cleanedText = cleanedText.replace(/```js/g, '').trim();
    
        const quizData = JSON.parse(cleanedText);

        res.status(200).json(quizData);
    } catch (err) {
        console.error('Error generating quiz:', err);
        res.status(500).json({ error: 'Failed to generate quiz. Check logs for details.' });
    }
};