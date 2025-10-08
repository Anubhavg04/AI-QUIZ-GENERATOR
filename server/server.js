const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware 
app.use(cors());
app.use(express.json());

// Initialize GenAI client 
// NOTE: We assume GEMINI_API_KEY is available in server/.env
const GenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define the core API handler logic (combined from the serverless file)
const apiHandler = async (req, res) => {
    // We already check for POST in the route definition below, but keep it for safety
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { topic, numQuestions } = req.body;

    if (!topic || !numQuestions) {
        return res.status(400).json({ error: 'Topic and numQuestions are required' });
    }

    try {
        const model = GenAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `Generate a ${numQuestions} question quiz about ${topic}. Return only a JSON array. Each item must be an object with: { "question": "...", "options": ["..",".."], "answer": "the correct option string" }. Do not include any commentary or markdown formatting outside the array.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        // Strip code fences (```json, ```js, or just ```)
        let cleanedText = text.replace(/```json|```js|```/g, '').trim();

        const quizData = JSON.parse(cleanedText);
        res.status(200).json(quizData);
        
    } catch (err) {
        console.error('Error generating quiz (API Handler):', err);
        res.status(500).json({ error: 'Failed to generate quiz. See logs.' });
    }
};

// --- ROUTE DEFINITION ---
// The Express server uses the API Handler for the specified route
app.post('/api/generate-quiz', apiHandler);


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
