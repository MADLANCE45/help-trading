require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');

// Il wallet del bot che porta a casa 6k al giorno
const TARGET_WALLET = "SQHK48QT8SY1vYN44iXji7wQ6CJek8AjfX6mBp47TZq";

// Connessione RPC (assicurati di avere RPC_URL nel tuo .env, o usa una pubblica)
const rpcUrl = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const solanaConnection = new Connection(rpcUrl, 'confirmed');

const LOG_FILE = './spy_log.json';
let ultimaFirmaProcessata = null;

// Inizializza il file di log se non esiste
if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify([]));
}

// Funzione di utilità per non martellare l'RPC
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function spiaWallet() {
    console.log(`\n🕵️‍♂️ [SPY-NET] Controllo attività per ${TARGET_WALLET}...`);
    
    try {
        const pubKey = new PublicKey(TARGET_WALLET);
        
        // Cerca nuove transazioni (fino all'ultima che abbiamo visto)
        const fetchOptions = { limit: 10 };
        if (ultimaFirmaProcessata) {
            fetchOptions.until = ultimaFirmaProcessata;
        }

        const signatures = await solanaConnection.getSignaturesForAddress(pubKey, fetchOptions);

        if (signatures.length === 0) {
            console.log("Nessuna nuova operazione.");
            return;
        }

        console.log(`🔥 Trovate ${signatures.length} nuove transazioni! Estrazione in corso...`);
        
        // Aggiorna l'ultima firma (la prima dell'array è la più recente)
        ultimaFirmaProcessata = signatures[0].signature;

        // Estrae i dettagli per ogni transazione
        const sigStrings = signatures.map(s => s.signature);
        const txs = await solanaConnection.getParsedTransactions(sigStrings, { maxSupportedTransactionVersion: 0 });

        let nuoviTrade = [];

        for (let i = 0; i < txs.length; i++) {
            const tx = txs[i];
            const sigInfo = signatures[i];
            
            if (!tx || !tx.meta || !tx.meta.postTokenBalances) continue;

            const preBals = tx.meta.preTokenBalances.filter(b => b.owner === TARGET_WALLET);
            const postBals = tx.meta.postTokenBalances.filter(b => b.owner === TARGET_WALLET);

            let solSpesiOGuadagnati = 0;
            
            // Calcolo SOL
            const walletAccIndex = tx.transaction.message.accountKeys.findIndex(k => k.pubkey.toString() === TARGET_WALLET);
            if (walletAccIndex !== -1 && tx.meta.preBalances && tx.meta.postBalances) {
                const preSol = tx.meta.preBalances[walletAccIndex] / 1e9;
                const postSol = tx.meta.postBalances[walletAccIndex] / 1e9;
                solSpesiOGuadagnati = Math.abs(preSol - postSol);
            }

            // Capire cosa ha comprato o venduto
            let actionType = "TRASFERIMENTO";
            let targetMint = "Sconosciuto";

            for (let post of postBals) {
                const mint = post.mint;
                if (mint === "So11111111111111111111111111111111111111112") continue; // Ignora wSOL

                const pre = preBals.find(b => b.mint === mint);
                const preAmount = pre ? (pre.uiTokenAmount.uiAmount || 0) : 0;
                const postAmount = post.uiTokenAmount.uiAmount || 0;

                if (postAmount > preAmount) {
                    actionType = "BUY"; 
                    targetMint = mint;
                } else if (postAmount < preAmount) {
                    actionType = "SELL"; 
                    targetMint = mint;
                }
            }

            if (actionType !== "TRASFERIMENTO") {
                const tradeData = {
                    timestamp: new Date(sigInfo.blockTime * 1000).toLocaleString('it-IT'),
                    azione: actionType,
                    sol: parseFloat(solSpesiOGuadagnati.toFixed(4)),
                    tokenMint: targetMint,
                    signature: sigInfo.signature
                };
                
                nuoviTrade.push(tradeData);
                
                const color = actionType === "BUY" ? "🟢" : "🔴";
                console.log(`${color} [${tradeData.timestamp}] ${actionType} -> ${tradeData.sol} SOL sul token ${targetMint}`);
            }
        }

        // Salva nel file JSON per l'analisi futura di Gemini
        if (nuoviTrade.length > 0) {
            const logEsistente = JSON.parse(fs.readFileSync(LOG_FILE));
            const logAggiornato = [...nuoviTrade, ...logEsistente]; // Mette i nuovi in cima
            fs.writeFileSync(LOG_FILE, JSON.stringify(logAggiornato, null, 2));
            console.log(`💾 Salvati ${nuoviTrade.length} trade nel database spia.`);
        }

    } catch (error) {
        console.error("❌ Errore durante lo spionaggio:", error.message);
    }
}

// Avvia il ciclo infinito (controlla ogni 10 secondi)
console.log(`🎯 TARGET ACQUISITO: ${TARGET_WALLET}`);
console.log(`📡 Inizio intercettazione on-chain... Premi Ctrl+C per fermare.\n`);

// Prima esecuzione immediata
spiaWallet();

// Loop ogni 10 secondi
setInterval(spiaWallet, 10000);