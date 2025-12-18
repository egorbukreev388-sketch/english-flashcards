// api/generate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = await req.json();
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_KEY_HERE';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: `
You are an English learning assistant.
User input: "${prompt}"
- If a number is given (e.g. "10 words"), generate exactly that many.
- If no number, generate exactly 12 items.
- Output ONLY valid JSON array:
[
  {"english": "word", "russian": "перевод"},
  ...
]
NO extra text.
    `.trim() }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 3000,
      topP: 0.8,
      topK: 40
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');

    const text = data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const words = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(words) || words.length === 0) throw new Error('Invalid words');

    return res.status(200).json({ success: true, words });
  } catch (err) {
    console.error('AI Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}