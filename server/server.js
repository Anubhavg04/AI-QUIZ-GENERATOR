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
        return; 
    }

    try{
        // *** FIX: Changed model identifier to a stable, supported model ***
        const model = GenAI.getGenerativeModel({model:'gemini-2.5-flash'});
        // ***************************************************************
        
        const prompt = `Generate a ${numQuestions} question quiz about ${topic}. This should be in a JSON array format. Do not include any text before or after the JSON. Each object in the array must have 'question', 'options' (an array of strings), and 'answer' (the correct option string).`;
        
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Clean the text to remove markdown code fences
        let cleanedtext = text.replace(/```json/g, '').replace(/```/g, '').trim();
        cleanedtext = cleanedtext.replace(/```js/g, '').trim();
    
        const quizData = JSON.parse(cleanedtext);

        res.json(quizData);
    }
    catch(err){
        // Log the specific error message for debugging
        console.error('Error generating quiz:', err.message || err);
        res.status(500).json({error : 'Failed to generate quiz'});
    }
});

app.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`);
})
