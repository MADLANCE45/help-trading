require('dotenv').config();
const fs = require('fs');
const { Connection, PublicKey } = require('@solana/web3.js');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const solanaConnection = new Connection(RPC_URL);

// IL WALLET ALGORITMICO DA ISPEZIONARE
const TARGET_WALLET = "EZzygUEZGLDgLG3JLapmpcEGTeJiEnXC8tVPXYXV63JG";
const FILE_LOG = "spy_log.json";

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function scaricaEAnalizza() {
    console.log(`\n🕵️ INIZIO INDAGINE FORENSE SU: ${TARGET_WALLET}`);
    console.log(`⏳ Scarico le transazioni in modo stealth (anti-blocco Helius)...`);

    let storico = [];
    
    // 1. CARICA STORICO ESISTENTE (se c'è)
    if (fs.existsSync(FILE_LOG)) {
        storico = JSON.parse(fs.readFileSync(FILE_LOG, 'utf8'));
        console.log(`📁 Trovate ${storico.length} transazioni salvate in locale.`);
    }

    try {
        // 2. ESTRAZIONE LENTA E SICURA DELLE FIRME (Prendiamo le ultime 100)
        const sigs = await solanaConnection.getSignaturesForAddress(new PublicKey(TARGET_WALLET), { limit: 100 });
        
        // Filtriamo le firme che abbiamo già nel JSON per non scaricare doppioni
        const nuoveFirme = sigs.filter(s => !storico.some(tx => tx.firma === s.signature));
        console.log(`🎣 Trovate ${nuoveFirme.length} NUOVE transazioni. Inizio download sicuro...`);

        // 3. DOWNLOAD DELLE TRANSAZIONI (a blocchi di 5, con delay pesanti)
        for (let i = 0; i < nuoveFirme.length; i += 5) {
            const chunk = nuoveFirme.slice(i, i + 5).map(s => s.signature);
            const txs = await solanaConnection.getParsedTransactions(chunk, { maxSupportedTransactionVersion: 0 });
            
            for (const tx of txs) {
                if (!tx || !tx.meta) continue;

                // Cerca token comprati/venduti
                const postBals = tx.meta.postTokenBalances || [];
                const preBals = tx.meta.preTokenBalances || [];
                
                for (let post of postBals) {
                    if (post.owner !== TARGET_WALLET || post.mint === "So11111111111111111111111111111111111111112") continue;
                    
                    const mint = post.mint;
                    const pre = preBals.find(b => b.owner === TARGET_WALLET && b.mint === mint);
                    const preAmount = pre ? pre.uiTokenAmount.uiAmount : 0;
                    const postAmount = post.uiTokenAmount.uiAmount;
                    
                    if (preAmount !== postAmount) {
                        storico.push({
                            firma: tx.transaction.signatures[0],
                            tipo: postAmount > preAmount ? 'BUY' : 'SELL',
                            mint: mint,
                            differenzaToken: Math.abs(postAmount - preAmount),
                            timestamp: tx.blockTime * 1000 // Convertito in millisecondi
                        });
                    }
                }
            }
            
            console.log(`[+] Scaricate ${Math.min(i + 5, nuoveFirme.length)}/${nuoveFirme.length}... (pausa 3s)`);
            await delay(3000); // 🛡️ AIRBAG ANTI-429: 3 SECONDI DI PAUSA!
        }

        // Salva tutto nel JSON
        fs.writeFileSync(FILE_LOG, JSON.stringify(storico, null, 2));
        console.log(`\n💾 Download completato. Salvezato in ${FILE_LOG}.`);

        // 4. AUTOPSIA LOCALE (Velocità della luce, zero API)
        analizzaDatiLocali(storico);

    } catch (e) {
        console.error("❌ Errore durante lo scaricamento:", e.message);
    }
}

// =====================================================================
// 🔬 MICROSCOPIO FINANZIARIO: ESTRAZIONE DELLA FORMULA DEL BOT
// =====================================================================
function analizzaDatiLocali(storico) {
    console.log(`\n📊 === AUTOPSIA AVANZATA DEL BOT ===`);
    
    // Rimuoviamo la spazzatura di sistema (i wrap di SOL che risultano undefined)
    const datiPuliti = storico.filter(tx => tx.mint && tx.mint !== 'undefined');
    if (datiPuliti.length === 0) return console.log("Nessun dato Token valido da analizzare.");

    const tokenMap = {};
    let totBuy = 0; let totSell = 0;
    let solSpesiTotali = 0; let tokenCompratiTotali = 0;
    let tokenVendutiTotali = 0;

    // Ordiniamo per tempo per vedere i pattern
    datiPuliti.sort((a, b) => a.timestamp - b.timestamp);

    datiPuliti.forEach(tx => {
        if (!tokenMap[tx.mint]) tokenMap[tx.mint] = { acquisti: 0, vendite: 0, sizeBuy: [], sizeSell: [] };
        
        if (tx.tipo === 'BUY') {
            totBuy++;
            tokenMap[tx.mint].acquisti++;
            tokenMap[tx.mint].sizeBuy.push(tx.differenzaToken);
            tokenCompratiTotali += tx.differenzaToken;
        } else {
            totSell++;
            tokenMap[tx.mint].vendite++;
            tokenMap[tx.mint].sizeSell.push(tx.differenzaToken);
            tokenVendutiTotali += tx.differenzaToken;
        }
    });

    console.log(`🟢 Operazioni BUY Reali: ${totBuy}`);
    console.log(`🔴 Operazioni SELL Reali: ${totSell}`);

    // Analizziamo la matematica esatta del bot
    const preferiti = Object.entries(tokenMap)
        .sort((a, b) => (b[1].acquisti + b[1].vendite) - (a[1].acquisti + a[1].vendite))
        .slice(0, 3); // Prende le 3 monete principali

    console.log(`\n🏆 LA FORMULA MATEMATICA SUI SUOI TOKEN PREFERITI:`);
    
    preferiti.forEach((t, i) => {
        const mint = t[0];
        const dati = t[1];
        
        // Calcola la Size Media
        const avgBuy = dati.sizeBuy.length > 0 ? (dati.sizeBuy.reduce((a,b)=>a+b,0) / dati.sizeBuy.length) : 0;
        const avgSell = dati.sizeSell.length > 0 ? (dati.sizeSell.reduce((a,b)=>a+b,0) / dati.sizeSell.length) : 0;
        
        // Calcola la Frazione di Scarico (Grid Ratio)
        let scaricoRatio = 0;
        if (avgBuy > 0 && avgSell > 0) scaricoRatio = (avgSell / avgBuy) * 100;

        console.log(`\n  🪙 Token ${i+1}: ${mint.substring(0,8)}...`);
        console.log(`     ➤ Acquisti: ${dati.acquisti} | Vendite: ${dati.vendite}`);
        if (dati.sizeBuy.length > 0) {
            console.log(`     ➤ Compra lotti medi da: ${avgBuy.toLocaleString()} token`);
        }
        if (dati.sizeSell.length > 0) {
            console.log(`     ➤ Vende lotti medi da:  ${avgSell.toLocaleString()} token`);
            console.log(`     🤖 TATTICA RILEVATA: Scarica il ${scaricoRatio.toFixed(1)}% della sua size d'ingresso per ogni click di vendita.`);
        }
    });
    
    console.log(`\n📋 COME IMITARLO NELLA REALTA':`);
    if (totSell > totBuy * 3) {
        console.log(` Questo è un TWAP Bot. Per imitarlo, non puoi fare ordini manuali. Devi creare uno script che:\n 1. Compra 1 SOL sul dip.\n 2. Imposta un loop che vende 0.05 SOL ogni 5 secondi appena il PnL è in verde.\n 3. Lascia che la posizione si svuoti lentamente sulla testa di chi fa FOMO.`);
    } else {
        console.log(` Questo è uno Scalper classico. Compra e vende la stessa Size.`);
    }
}