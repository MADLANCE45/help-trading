const express = require('express');

const cors = require('cors');

const app = express();
const PORT = 3000; 

// 1. Sblocca le chiamate dal browser (Pump.fun)
app.use(cors());

// 2. Permette al server di leggere i file JSON in arrivo (sostituisce bodyParser)
app.use(express.json({ limit: '50mb' })); 


// --- ROTTE PER L'ESTENSIONE ---
app.get('/api/scan/:token', (req, res) => {
    // Qui andrà la tua logica del radar per i Fresh Wallets, Sniper Bots, ecc...
    res.json({ message: "Dati recuperati con successo!" });
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