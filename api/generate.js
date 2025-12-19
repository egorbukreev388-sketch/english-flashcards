export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const API_KEY = process.env.GEMINI_API_KEY;
  const userPrompt = req.body.prompt;

  if (!API_KEY) return res.status(500).json({ error: 'API key missing' });

  // Извлекаем число слов (по умолчанию 15)
  const extractNumber = (text) => {
    const match = text.match(/\b(\d+)\b/);
    return match ? parseInt(match[1]) : 15;
  };

  const count = extractNumber(userPrompt);

  const systemInstruction = `
    You are an expert English Language Teacher. Your task is to generate high-quality flashcards.
    
    CRITICAL RULES:
    1. Output MUST be a valid JSON array of objects: [{"english": "...", "russian": "..."}].
    2. Never combine multiple words into one card. Each card must be a single term, phrase, or sentence.
    3. Generate EXACTLY ${count} cards unless the user provided a specific list with a different count.
    
    SCENARIOS:
    A) If the user provides a LIST of words (e.g., "apple - яблоко"):
       - Just format them into JSON. Do not add random words.
    B) If the user provides a LONG TEXT:
       - Extract the most useful, academic, or key vocabulary terms for an English learner. 
       - Provide clear, accurate Russian translations.
    C) If the user provides a TOPIC (e.g., "Finance"):
       - Generate a professional selection of words, phrases, and 2-3 short example sentences.
       - Ensure a mix of nouns, verbs, and collocations.
    
    No explanations. No markdown formatting. Only raw JSON.
  `;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemInstruction + "\n\nUser Input: " + userPrompt }]
        }],
        generationConfig: {
          temperature: 0.7, // Как в твоем GAS скрипте для креативности
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4000
        }
      })
    });

    const data = await response.json();
    
    if (data.error) return res.status(500).json({ error: data.error.message });
    if (!data.candidates || !data.candidates[0]) throw new Error("No candidates returned");

    let resultText = data.candidates[0].content.parts[0].text;
    
    // Очистка ответа от возможных артефактов
    const jsonStart = resultText.indexOf('[');
    const jsonEnd = resultText.lastIndexOf(']') + 1;
    const cleanJson = resultText.substring(jsonStart, jsonEnd);
    
    const parsedWords = JSON.parse(cleanJson);

    // Дополнительная проверка: если ИИ вернул 1 элемент, а просили много
    if (parsedWords.length === 1 && count > 1 && parsedWords[0].english.length > 100) {
        throw new Error("AI generated a single huge card instead of a list. Please try again.");
    }

    res.status(200).json({ words: parsedWords });
  } catch (error) {
    console.error("Internal Error:", error);
    res.status(500).json({ error: "Failed to parse AI response. Make sure your input is clear." });
  }
}
