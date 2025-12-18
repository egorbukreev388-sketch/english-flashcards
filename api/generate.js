export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const API_KEY = process.env.GEMINI_API_KEY;
  const userPrompt = req.body.prompt;

  if (!API_KEY) return res.status(500).json({ error: 'API key missing' });

  // Логика извлечения количества (как в твоем GAS скрипте)
  const extractNumber = (text) => {
    const match = text.match(/\b(\d+)\b/);
    return match ? parseInt(match[1]) : 15;
  };

  const count = extractNumber(userPrompt);
  
  // Определяем тип контента
  let contentType = "words and phrases";
  if (userPrompt.toLowerCase().includes("предложен") || userPrompt.toLowerCase().includes("sentenc")) {
    contentType = "full sentences";
  } else if (userPrompt.toLowerCase().includes("фраз") || userPrompt.toLowerCase().includes("phras")) {
    contentType = "useful phrases";
  }

  const systemPrompt = `Analyze user request: "${userPrompt}".
  1. Create EXACTLY ${count} items.
  2. Type of content: ${contentType}.
  3. Theme: strictly follow the user's topic.
  4. Return ONLY a raw JSON array: [{"english": "...", "russian": "..."}].
  No markdown, no talk, only JSON.`;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let resultText = data.candidates[0].content.parts[0].text;
    const cleanJson = resultText.replace(/```json|```/g, "").trim();
    
    res.status(200).json({ words: JSON.parse(cleanJson) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
