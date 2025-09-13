const express = require('express');
const cors = require('cors');
require('dotenv').config();
const {GoogleGenerativeAI} = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware 
app.use(cors());
app.use(express.json());

// Initialize GenAI client with API Key
const GenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/generative-quiz',async(req, res) => {
    const {topic, numQuestions} = req.body;
    if(!topic){
        res.status(400).json({error:'Topic is required'});
    }

    try{
        // use pro model of gemini
        const model = GenAI.getGenerativeModel({model:'gemini-pro'});
        const prompt = `Generate a ${numQuestions} question quiz about  ${topic}. This should be in a JSON array format. Each object in the array should have 'question', 'options' (an array), and 'answer' (the correct option).`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const quizData = JSON.parse(text);

        res.json(quizData);
    }
    catch(err){
        console.error('Error generating quiz:', err);
        res.status(500).json({error : 'Failed to generate quiz'});
    }
});

app.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`);
})