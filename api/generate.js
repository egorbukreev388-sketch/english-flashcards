export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const API_KEY = process.env.GEMINI_API_KEY;
  const userPrompt = req.body.prompt;

  const systemPrompt = `You are a professional English teacher. Create 15 flashcards for the theme: "${userPrompt}". 
  Return ONLY a valid JSON array of objects like this: [{"english": "word", "russian": "перевод"}]. 
  No markdown, no explanation, only raw JSON.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    const cleanJson = resultText.replace(/```json|```/g, "").trim();
    
    res.status(200).json({ words: JSON.parse(cleanJson) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
