const API_KEY = "b85ff0ae-b208-4fe9-897b-1d7a446b9d36"; 
const TARGET_WALLET = "SQHK48QT8SY1vYN44iXji7wQ6CJek8AjfX6mBp47TZq";

// --- IL NOSTRO MOTORE SCAM SCORE ---
function calcolaScamScore(tx, mint, amount) {
    let score = 0;
    let alert = [];

    // Regola 1: Priority Fee altissime (> 50.000 lamports è anomalo per un utente normale)
    if (tx.fee > 50000) {
        score += 40;
        alert.push("Priority Fee estrema (Sniper)");
    }

    // Regola 2: Token Pump.fun
    if (mint.endsWith('pump')) {
        score += 20;
        alert.push("Lancio Pump.fun rilevato");
    }

    // Regola 3: Acquisti massicci (1% della supply di pump.fun = 10 milioni)
    if (amount > 5000000) {
        score += 30;
        alert.push("Acquisto massiccio (>5M token)");
    }

    // Valutazione finale
    let livello = "🟢 SICURO";
    if (score >= 40) livello = "🟡 SOSPETTO";
    if (score >= 70) livello = "🔴 RUG/SNIPER BOT";

    return { score, livello, alert };
}

async function getHistory() {
    const url = `https://api.helius.xyz/v0/addresses/${TARGET_WALLET}/transactions?api-key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        console.log(`\n🕵️ Analisi Profilo: ${TARGET_WALLET}`);
        console.log(`--------------------------------------------------`);

        const limit = Math.min(5, data.length); // Analizziamo le ultime 5
        for (let i = 0; i < limit; i++) {
            const tx = data[i];
            
            if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
                // Prendiamo il primo token trasferito per valutarlo
                const transfer = tx.tokenTransfers[0];
                const mint = transfer.mint;
                const amount = transfer.tokenAmount;

                // Passiamo i dati al nostro motore di calcolo
                const valutazione = calcolaScamScore(tx, mint, amount);

                console.log(`[Tx ${i + 1}] Mint: ${mint.substring(0, 8)}...`);
                console.log(`⚠️ Verdetto: ${valutazione.livello} (Punteggio: ${valutazione.score})`);
                console.log(`📌 Motivi: ${valutazione.alert.join(" | ")}`);
                console.log(`--------------------------------------------------`);
            }
        }
        
    } catch (error) {
        console.error("❌ Errore:", error);
    }
}

getHistory();