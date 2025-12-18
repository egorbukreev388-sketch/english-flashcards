export default async function handler(req, res) {
  // 1. Проверка метода
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  
  // 2. Проверка наличия ключа
  if (!API_KEY) {
    return res.status(500).json({ error: 'Ошибка: API ключ не найден в настройках Vercel!' });
  }

  const userPrompt = req.body.prompt;
  const systemPrompt = `You are an English teacher. Create 15 flashcards for: "${userPrompt}". 
  Return ONLY a raw JSON array: [{"english": "word", "russian": "перевод"}]. 
  No markdown, no talk.`;

  try {
    // Используем актуальную модель 1.5-flash (или 2.0-flash если доступна)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    const data = await response.json();

    // 3. Проверка ошибок от самого Google
    if (data.error) {
      return res.status(500).json({ error: `Google API Error: ${data.error.message}` });
    }

    if (!data.candidates || !data.candidates[0]) {
      return res.status(500).json({ error: 'ИИ не вернул ответ. Возможно, сработал фильтр безопасности.' });
    }

    let resultText = data.candidates[0].content.parts[0].text;
    
    // Очистка ответа от лишних символов (иногда ИИ пишет ```json ... ```)
    const cleanJson = resultText.replace(/```json|```/g, "").trim();
    
    res.status(200).json({ words: JSON.parse(cleanJson) });

  } catch (error) {
    console.error("API Route Error:", error);
    res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}
