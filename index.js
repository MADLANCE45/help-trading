const express = require('express');
const cors = require('cors');
const { Connection, PublicKey } = require('@solana/web3.js'); // Importiamo la libreria Solana

// Inserisci qui la tua API Key
const HELIUS_API_KEY = "b85ff0ae-b208-4fe9-897b-1d7a446b9d36"; 
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Creiamo la connessione diretta e ad alte prestazioni con la blockchain
const solanaConnection = new Connection(RPC_URL, 'confirmed');

const app = express();
const PORT = 3000; 
// Esempio logico da integrare nel tuo index.js
async function detectBundle(tokenMint) {
    // 1. Prendi le prime 20-30 transazioni della moneta appena nata
    const signatures = await connection.getSignaturesForAddress(
        new PublicKey(tokenMint), 
        { limit: 30 }
    );

    // 2. Raggruppa le transazioni per "Slot" (Blocco)
    const slotCounts = {};
    signatures.forEach(sig => {
        slotCounts[sig.slot] = (slotCounts[sig.slot] || 0) + 1;
    });

    // 3. Se nel blocco di creazione (o in quello immediatamente successivo) 
    // ci sono più di 3-4 acquisti, è matematicamente un Bundle Bot.
    const creationSlot = signatures[signatures.length - 1].slot;
    const bundledTxCount = slotCounts[creationSlot];

    if (bundledTxCount > 3) {
        return {
            isBundle: true,
            bundleSize: bundledTxCount,
            warning: `⚠️ BUNDLE RILEVATO: ${bundledTxCount} transazioni nello stesso blocco di lancio!`
        };
    }
    return { isBundle: false };
}

app.use(express.json({ limit: '50mb' }));
// 1. Sblocca le chiamate dal browser (Pump.fun)
app.use(cors());



async function calcolaEtaWallet(walletAddress) {
    try {
        const pubKey = new PublicKey(walletAddress);
        
        // Otteniamo la cronologia delle firme (transazioni) associate a questo wallet
        const signatures = await solanaConnection.getSignaturesForAddress(pubKey, { limit: 1000 });
        
        if (signatures.length === 0) return 0; // Wallet vuoto o inesistente

        // L'ultima transazione nell'array è la più vecchia
        const oldestTx = signatures[signatures.length - 1];
        
        // Se la transazione ha un timestamp, calcoliamo i giorni trascorsi
        if (oldestTx.blockTime) {
            const firstTxTime = oldestTx.blockTime * 1000; // Convertiamo in millisecondi
            const ageInDays = (Date.now() - firstTxTime) / (1000 * 60 * 60 * 24);
            return ageInDays;
        }
        
        return null;

    } catch (error) {
        console.error(`Errore nella lettura del wallet ${walletAddress}:`, error);
        return null;
    }
}
// --- ROTTE PER L'ESTENSIONE ---
// --- ROTTE PER L'ESTENSIONE ---
app.get('/api/scan/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;

    try {
        console.log(`\n🔍 Scansione ON-CHAIN avviata per: ${tokenMint}`);

        // 1. Cerchiamo il creatore del token (il "Dev") analizzando le transazioni
        const mintPubKey = new PublicKey(tokenMint);
        const signatures = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 1000 });
        
        let devWallet = "Sconosciuto";
        let walletAgeDays = null;
        let onChainScore = 0; // Punteggio basato sui dati puri della blockchain
        let logAnalisi = [];

        if (signatures.length > 0) {
            // L'ultima transazione nell'array è la prima cronologicamente (il momento della creazione)
            const launchTx = signatures[signatures.length - 1];
            
            // Scarichiamo i dettagli di quella primissima transazione
            const txDetails = await solanaConnection.getParsedTransaction(launchTx.signature, { maxSupportedTransactionVersion: 0 });
            
            if (txDetails && txDetails.transaction.message.accountKeys.length > 0) {
                // Il primo account che firma la transazione di creazione è il Dev
                devWallet = txDetails.transaction.message.accountKeys[0].pubkey.toString();
                console.log(`👤 Dev Wallet individuato: ${devWallet}`);
                
                // 2. Calcoliamo l'età del wallet del Dev usando la nostra funzione!
                walletAgeDays = await calcolaEtaWallet(devWallet);
                
                if (walletAgeDays !== null) {
                    console.log(`⏳ Età del portafoglio Dev: ${walletAgeDays.toFixed(2)} giorni`);
                    
                    if (walletAgeDays < 1) {
                        onChainScore += 80;
                        logAnalisi.push("🛑 FAKE DEV: Il portafoglio del creatore è nato da meno di 24 ore!");
                    } else if (walletAgeDays < 7) {
                        onChainScore += 40;
                        logAnalisi.push("⚠️ ATTENZIONE: Portafoglio del creatore molto recente (meno di una settimana).");
                    } else {
                        logAnalisi.push("✅ Portafoglio storico. Il Dev usa un wallet consolidato.");
                    }
                }
            }
        }

        // 3. Controlliamo comunque la liquidità per avere un quadro completo
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
        const data = await response.json();

        let dexscreenerScore = 0;
        if (!data.pairs || data.pairs.length === 0) {
            dexscreenerScore = 20; 
            logAnalisi.push("⚠️ Nessuna pool di liquidità trovata su DexScreener.");
        } else {
            const liquidity = data.pairs[0].liquidity?.usd || 0;
            if (liquidity < 5000) {
                dexscreenerScore = 20;
                logAnalisi.push("⚠️ Liquidità sotto i $5000 (rischio rug veloce).");
            }
        }

        // 4. Calcolo del punteggio finale
        let finalScore = Math.min(onChainScore + dexscreenerScore, 100);
        let rischioStatus = finalScore >= 80 ? "ESTREMO (Fake Dev / Rug Probabile)" : finalScore >= 50 ? "ALTO" : finalScore >= 20 ? "MODERATO" : "BASSO";

        console.log(`📊 Punteggio finale calcolato: ${finalScore}/100\n`);

        // 5. Spediamo i dati veri all'estensione!
        res.json({
            score: finalScore,
            rischio: rischioStatus,
            dumperTrovati: "In sviluppo...", // Lo aggiungeremo dopo con i WebSockets
            devWallet: devWallet,
            devAgeDays: walletAgeDays !== null ? walletAgeDays.toFixed(2) : "N/A",
            dettagli: logAnalisi
        });

    } catch (error) {
        console.error("Errore nell'analisi on-chain:", error);
        res.status(500).json({ error: "Errore durante la scansione della blockchain. Riprova." });
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