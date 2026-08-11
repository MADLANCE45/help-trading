require('dotenv').config();

async function scopriModelli() {
    try {
        const rawKey = process.env.GEMINI_API_KEY || "";
        const apiKey = rawKey.replace(/['"\s]/g, '');
        
        console.log("⏳ Interrogo Google Cloud con la tua chiave per vedere a cosa hai accesso...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("\n❌ ERRORE GOOGLE CLOUD:", data.error.message);
            console.log("👉 SOLUZIONE: Vai su Google Cloud Console, cerca 'Generative Language API' e clicca su ABILITA (Enable) per il tuo progetto.");
            return;
        }

        console.log("\n✅ MODELLI AUTORIZZATI PER LA TUA CHIAVE:");
        data.models.forEach(m => console.log("-", m.name));
        console.log("\n👉 Copia uno dei nomi qui sopra (es. 'gemini-1.5-flash') e inseriscilo nel tuo index.js!");
        
    } catch (e) {
        console.error("Errore di rete:", e.message);
    }
}

scopriModelli();