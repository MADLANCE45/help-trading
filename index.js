const express = require('express');

const cors = require('cors');

const app = express();
const PORT = 3000; 

// 1. Sblocca le chiamate dal browser (Pump.fun)
app.use(cors());

// 2. Permette al server di leggere i file JSON in arrivo (sostituisce bodyParser)
app.use(express.json({ limit: '50mb' })); 


// --- ROTTE PER L'ESTENSIONE ---
app.get('/api/scan/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;

    try {
        // 1. Chiamiamo un'API esterna per ottenere i dati reali del token
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
        const data = await response.json();

        // 2. Logica di calcolo del rischio
        let score = 0;
        let rischioStatus = "Analisi in corso";
        let dumperTrovati = "0";

        // Se l'API non trova il token o non ha liquidità
        if (!data.pairs || data.pairs.length === 0) {
            score = 90;
            rischioStatus = "Estremo (Nessuna liquidità / Appena lanciato)";
        } else {
            // Analizziamo la liquidità del primo pair trovato
            const liquidity = data.pairs[0].liquidity?.usd || 0;
            
            if (liquidity < 5000) {
                score = 75;
                rischioStatus = "Alto (Bassa Liquidità)";
            } else if (liquidity > 50000) {
                score = 10;
                rischioStatus = "Basso (Buona Liquidità)";
            } else {
                score = 40;
                rischioStatus = "Medio";
            }
        }

        // 3. Inviamo i dati dinamici all'estensione Chrome
        res.json({
            score: score,
            rischio: rischioStatus,
            dumperTrovati: dumperTrovati
        });

    } catch (error) {
        console.error("Errore nel backend:", error);
        res.status(500).json({ error: "Impossibile analizzare il token sulla blockchain." });
    }
});

// --- ROTTA PER I WEBHOOK DI HELIUS ---
app.post('/webhook', async (req, res) => {
    const data = req.body;
    res.status(200).send('OK'); // Risponde subito a Helius

    if (data && data.length > 0) {
        data.forEach(tx => {
            console.log(`\n🚨 ANALISI TRANSAZIONE: ${tx.signature}`);
            
            let scamScore = 0;
            let logAnalisi = [];

            // 1. Controllo Jito
            const isJito = tx.description && tx.description.toLowerCase().includes("jito");
            if (isJito) {
                scamScore += 50;
                logAnalisi.push("🚩 Uso di Jito Bundle rilevato (+50 pt)");
            }

            // 2. Controllo Fee
            if (tx.fee > 100000) { 
                scamScore += 20;
                logAnalisi.push("⚠️ Fee pagata sospettosamente alta (+20 pt)");
            }

            // 3. Controllo età del Wallet
            if (tx.walletAgeDays !== undefined && tx.walletAgeDays < 1) {
                scamScore += 30;
                logAnalisi.push("🛑 Wallet creato da meno di 24 ore! (+30 pt)");
            }

            // 4. Controllo percentuale acquistata
            if (tx.percentageBought !== undefined && tx.percentageBought >= 5) {
                scamScore += 40;
                logAnalisi.push("🐳 Acquisto massivo! Ha comprato il " + tx.percentageBought + "% della supply (+40 pt)");
            }

            // Limita il punteggio a 100 massimo
            scamScore = Math.min(scamScore, 100);

            // Stampa il report finale
            console.log(`Punteggio Scam: ${scamScore}/100`);
            
            if (logAnalisi.length > 0) {
                console.log(`Motivazioni: \n  - ${logAnalisi.join('\n  - ')}`);
            } else {
                console.log(`✅ Nessun indicatore sospetto rilevato. Sicuro!`);
            }

            // Verdetto
            if (scamScore >= 80) {
                console.log(`❌ VERDETTO: ALLARME ROSSO! Possibile Scam/Sniper.`);
            } else if (scamScore >= 40) {
                console.log(`⚠️ VERDETTO: Rischio Moderato. Fare attenzione.`);
            } else {
                console.log(`🟢 VERDETTO: Sembra pulito.`);
            }
            console.log(`--------------------------------------------------`);
        });
    }
});

// --- ACCENSIONE DEL SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server Radar avviato e in ascolto sulla porta ${PORT}`);
});