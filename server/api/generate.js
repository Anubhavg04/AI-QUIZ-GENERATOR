// server/api/generate.js
export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { topic, numQuestions } = req.body || {};
  if (!topic || !numQuestions) {
    return res.status(400).json({ error: 'Topic and numQuestions are required' });
  }

  try {
    // dynamic import to avoid module system mismatch
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY');
      return res.status(500).json({ error: 'Server misconfiguration: missing GEMINI_API_KEY' });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Generate a ${numQuestions} question quiz about ${topic}.
Return only a JSON array. Each item must be an object with:
{ "question": "...", "options": ["..",".."], "answer": "the correct option string" }`;

    const result = await model.generateContent(prompt);
    // previous code used result.response.text(); keep safe access:
    const text = typeof result?.response?.text === 'function'
      ? result.response.text()
      : JSON.stringify(result);

    // strip code fences if any
    const cleaned = text.replace(/```json|```js|```/g, '').trim();

    const quizData = JSON.parse(cleaned);
    return res.status(200).json(quizData);
  } catch (err) {
    console.error('Error generating quiz:', err);
    return res.status(500).json({ error: 'Failed to generate quiz. See logs.' });
  }
}
