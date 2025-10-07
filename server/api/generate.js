import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { topic, numQuestions } = req.body;

  if (!topic || !numQuestions) {
    return res.status(400).json({ error: "Topic and numQuestions are required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Generate a ${numQuestions} question quiz about ${topic}. 
    The result must be a JSON array where each item has 'question', 'options', and 'answer' fields only.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Clean possible code block markdown
    let cleanedText = text.replace(/```json|```js|```/g, "").trim();

    const quizData = JSON.parse(cleanedText);
    res.status(200).json(quizData);
  } catch (err) {
    console.error("Error generating quiz:", err);
    res.status(500).json({ error: "Failed to generate quiz. Check logs for details." });
  }
}
