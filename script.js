// --- КОНФИГУРАЦИЯ FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyB0rdcOyeV1nOGNHueIBFRBD9qFvZl4LXM",
    authDomain: "slova-2581b.firebaseapp.com",
    projectId: "slova-2581b",
    storageBucket: "slova-2581b.firebasestorage.app",
    messagingSenderId: "721297377916",
    appId: "1:721297377916:web:04b2aa9adb0c5e2e3cd7f9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- ПЕРЕМЕННЫЕ ---
let currentWords = [
    {english: "Welcome", russian: "Добро пожаловать"}
];
let currentIndex = 0;
const GEMINI_API_KEY = "AIzaSyA7Kpp678a_d5T1bbgxYAmLek3R85br4uY"; // Ключ из твоего кода

// --- ЭЛЕМЕНТЫ ---
const card = document.getElementById('main-card');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const genBtn = document.getElementById('generate-btn');
const aiInput = document.getElementById('ai-input');

// --- ЛОГИКА КАРТОЧЕК ---
function updateCard() {
    const word = currentWords[currentIndex];
    document.getElementById('word-en').innerText = word.english;
    document.getElementById('word-ru').innerText = word.russian;
    document.getElementById('counter').innerText = `${currentIndex + 1} / ${currentWords.length}`;
    card.classList.remove('flipped');
}

card.addEventListener('click', () => card.classList.toggle('flipped'));

nextBtn.addEventListener('click', () => {
    if (currentIndex < currentWords.length - 1) {
        currentIndex++;
        updateCard();
    }
});

prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        updateCard();
    }
});

// --- ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ ---
document.getElementById('to-ai-btn').onclick = () => {
    document.getElementById('card-view').classList.remove('active');
    document.getElementById('ai-view').classList.add('active');
};

document.getElementById('back-to-cards').onclick = () => {
    document.getElementById('ai-view').classList.remove('active');
    document.getElementById('card-view').classList.add('active');
};

// --- РАБОТА С ИИ (Gemini) ---
genBtn.onclick = async () => {
    const promptText = aiInput.value;
    if (!promptText) return alert("Введите тему");

    document.getElementById('loader').classList.remove('hidden');
    
    const prompt = `Create a list of 15 English words or phrases for theme: "${promptText}". 
    Format as JSON array only: [{"english": "word", "russian": "перевод"}]. No extra text.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        const jsonWords = JSON.parse(textResponse.match(/\[.*\]/s)[0]);
        
        saveSetToFirebase(jsonWords);
    } catch (e) {
        console.error(e);
        alert("Ошибка ИИ. Попробуйте еще раз.");
    } finally {
        document.getElementById('loader').classList.add('hidden');
    }
};

// --- FIREBASE: СОХРАНЕНИЕ И ЗАГРУЗКА ---
async function saveSetToFirebase(words) {
    try {
        const docRef = await db.collection("word_sets").add({
            words: words,
            createdAt: new Date()
        });
        // Обновляем URL и загружаем новые слова
        const newUrl = window.location.origin + window.location.pathname + '?id=' + docRef.id;
        window.history.pushState({path:newUrl},'',newUrl);
        
        currentWords = words;
        currentIndex = 0;
        updateCard();
        document.getElementById('share-container').classList.remove('hidden');
        document.getElementById('back-to-cards').click();
    } catch (e) {
        console.error("Error saving: ", e);
    }
}

async function loadSetFromFirebase(id) {
    try {
        const doc = await db.collection("word_sets").doc(id).get();
        if (doc.exists) {
            currentWords = doc.data().words;
            updateCard();
            document.getElementById('share-container').classList.remove('hidden');
        }
    } catch (e) {
        console.log("No such set");
    }
}

// Поделиться ссылкой
document.getElementById('share-btn').onclick = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Ссылка скопирована! Отправь её другу.");
};

// Проверка URL при запуске
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const setId = urlParams.get('id');
    if (setId) {
        loadSetFromFirebase(setId);
    } else {
        updateCard();
    }
};
