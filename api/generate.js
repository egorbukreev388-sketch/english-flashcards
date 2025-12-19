export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const API_KEY = process.env.GEMINI_API_KEY;
  const userPrompt = req.body.prompt;

  if (!API_KEY) return res.status(500).json({ error: 'API key missing' });

  // Логика извлечения числа из запроса (как в твоем оригинале)
  const extractNumber = (text) => {
    const match = text.match(/\b(\d+)\b/);
    return match ? parseInt(match[1]) : 15;
  };

  const count = extractNumber(userPrompt);
  
  // Настройка типа контента
  let contentType = "смесь слов и полезных фраз";
  if (userPrompt.toLowerCase().includes("предложен") || userPrompt.toLowerCase().includes("sentenc")) {
    contentType = "полные законченные предложения";
  } else if (userPrompt.toLowerCase().includes("фраз") || userPrompt.toLowerCase().includes("phras")) {
    contentType = "устойчивые выражения и фразы";
  }

  // Формируем промпт на основе твоих требований
  const systemPrompt = `Ты - профессиональный помощник для создания карточек английского.
  ПРОАНАЛИЗИРУЙ запрос: "${userPrompt}".
  1. Создай РОВНО ${count} элементов.
  2. Тип контента: ${contentType}.
  3. Темы: строго придерживайся тематики запроса.
  4. Формат: Верни ТОЛЬКО чистый JSON массив: [{"english": "фраза", "russian": "перевод"}].
  Без вводных слов и без разметки markdown.`;

  try {
    // Используем 1.5-flash (высокие лимиты) и настройки из твоего GAS (temperature: 0.7)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
          topP: 0.8,
          topK: 40
        }
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let resultText = data.candidates[0].content.parts[0].text;
    const cleanJson = resultText.replace(/```json|```/g, "").trim();
    
    res.status(200).json({ words: JSON.parse(cleanJson) });
  } catch (error) {
    res.status(500).json({ error: "Ошибка генерации: " + error.message });
  }
}
