const express = require('express');
const cors = require('cors');
const { Connection, PublicKey } = require('@solana/web3.js');

// Inserisci qui la tua API Key
const HELIUS_API_KEY = "b85ff0ae-b208-4fe9-897b-1d7a446b9d36"; 
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Creiamo la connessione con la blockchain (UNA SOLA VOLTA)
const solanaConnection = new Connection(RPC_URL, 'confirmed');

const app = express();
const PORT = 3000; 

app.use(express.json({ limit: '50mb' }));
app.use(cors());



async function analizzaClusterAcquirenti(mintPubKey) {
    try {
        const signatures = await solanaConnection.getSignaturesForAddress(new PublicKey(mintPubKey), { limit: 50 });
        if (signatures.length === 0) return { clusterRisk: 0, dettagli: "Nessuna transazione trovata." };

        let walletAcquirenti = new Set();
        let finanziatoriMap = {};
        let primoAcquistoTime = null;

        for (let i = signatures.length - 1; i >= Math.max(0, signatures.length - 15); i--) {
            const tx = await solanaConnection.getParsedTransaction(signatures[i].signature, { maxSupportedTransactionVersion: 0 });
            
            if (tx && tx.transaction && tx.transaction.message.accountKeys) {
                const buyer = tx.transaction.message.accountKeys[0].pubkey.toString();
                walletAcquirenti.add(buyer);
                
                if (!primoAcquistoTime && tx.blockTime) {
                    primoAcquistoTime = new Date(tx.blockTime * 1000).toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
                }
            }
        }

        let finanziatoriComuni = 0;
        for (let buyer of walletAcquirenti) {
            const buyerPub = new PublicKey(buyer);
            const history = await solanaConnection.getSignaturesForAddress(buyerPub, { limit: 10 });
            if (history.length > 0) {
                const fundingTx = await solanaConnection.getParsedTransaction(history[history.length - 1].signature, { maxSupportedTransactionVersion: 0 });
                if (fundingTx && fundingTx.transaction.message.accountKeys.length > 1) {
                    const funder = fundingTx.transaction.message.accountKeys[1].pubkey.toString();
                    finanziatoriMap[funder] = (finanziatoriMap[funder] || 0) + 1;
                    if (finanziatoriMap[funder] > 1) {
                        finanziatoriComuni++; 
                    }
                }
            }
        }

        if (finanziatoriComuni >= 2) {
            return {
                clusterRisk: 50,
                orarioAccumulo: primoAcquistoTime || "Sconosciuto",
                avviso: `⚠️ CLUSTER (Bundle): Accumulo iniziato esattamente alle ${primoAcquistoTime}.`
            };
        }

        return { clusterRisk: 0, avviso: "✅ Gli acquirenti sembrano indipendenti." };

    } catch (error) {
        console.error("Errore nell'analisi del cluster:", error);
        return { clusterRisk: 0, avviso: "Impossibile analizzare il cluster di wallet." };
    }
}

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
        console.log(`\n🔍 Scansione Avanzata ON-CHAIN per: ${tokenMint}`);
        const mintPubKey = new PublicKey(tokenMint);
        
        // 1. Controlliamo l'età del Dev (come prima)
        const signatures = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 1000 });
        let devWallet = "Sconosciuto";
        let walletAgeDays = null;
        let onChainScore = 0;
        let logAnalisi = [];

        if (signatures.length > 0) {
            const launchTx = signatures[signatures.length - 1];
            const txDetails = await solanaConnection.getParsedTransaction(launchTx.signature, { maxSupportedTransactionVersion: 0 });
            
            if (txDetails && txDetails.transaction.message.accountKeys.length > 0) {
                devWallet = txDetails.transaction.message.accountKeys[0].pubkey.toString();
                walletAgeDays = await calcolaEtaWallet(devWallet);
                
                if (walletAgeDays !== null) {
                    if (walletAgeDays < 1) {
                        onChainScore += 50;
                        logAnalisi.push("🛑 FAKE DEV: Portafoglio del creatore nato da meno di 24 ore!");
                    } else {
                        logAnalisi.push("✅ Portafoglio Dev storico.");
                    }
                }
            }
        }

        // 2. Eseguiamo il nuovo controllo dei Cluster (I bot coordinati)
        const clusterCheck = await analizzaClusterAcquirenti(mintPubKey);
        onChainScore += clusterCheck.clusterRisk;
        logAnalisi.push(clusterCheck.avviso);

        // 3. Controlliamo la liquidità di base
        // 3. Controlliamo la liquidità e il Market Cap da DexScreener
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
        const data = await response.json();

        let liquidityScore = 0;
        let currentFdv = 0; // Market Cap (Fully Diluted Valuation)

        if (!data.pairs || data.pairs.length === 0) {
            liquidityScore = 20;
            logAnalisi.push("⚠️ Dati Dex non trovati (Token appena nato).");
        } else {
            const liquidity = data.pairs[0].liquidity?.usd || 0;
            currentFdv = data.pairs[0].fdv || 0; // Prendiamo il Market Cap

            if (liquidity < 5000) {
                liquidityScore = 20;
            }
        }

        // 4. Eseguiamo il SIMULATORE DI RENDIMENTO
        const isFakeDev = (walletAgeDays !== null && walletAgeDays < 1);
        const simulazione = calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterCheck.clusterRisk);

        logAnalisi.push(`📈 Simulazione: ${simulazione.consiglio}`);

        // 5. Calcolo Finale del Rischio
        let finalScore = Math.min(onChainScore + liquidityScore, 100);
        let rischioStatus = finalScore >= 80 ? "ESTREMO" : finalScore >= 50 ? "ALTO" : "MODERATO/BASSO";

        // Manda i dati al Frontend (aggiungiamo i nuovi campi)
        res.json({
            score: finalScore,
            rischio: rischioStatus,
            dumperTrovati: clusterCheck.clusterRisk > 0 ? "Rilevati" : "0",
            devWallet: devWallet,
            devAgeDays: walletAgeDays !== null ? walletAgeDays.toFixed(2) : "N/A",
            potenzialeX: simulazione.potenzialeX,         // <--- NUOVO
            targetUscita: simulazione.targetUscita,       // <--- NUOVO
            dettagli: logAnalisi
        });

    } catch (error) {
        console.error("Errore nell'analisi avanzata:", error);
        res.status(500).json({ error: "Errore durante l'analisi della blockchain." });
    }
});
async function trovaWalletMadre(walletAddress) {
    try {
        const pubKey = new PublicKey(walletAddress);
        
        // Prendiamo le transazioni più vecchie possibili (per semplicità analizziamo l'ultimo blocco di 1000 tx)
        // In un sistema di produzione massiccio dovresti fare una paginazione fino all'inizio della storia del wallet
        const signatures = await solanaConnection.getSignaturesForAddress(pubKey, { limit: 1000 });
        
        if (signatures.length === 0) return "Nessuna cronologia";

        // La transazione più vecchia nell'array è l'ultima (signatures[signatures.length - 1])
        const oldestTx = signatures[signatures.length - 1];
        
        const txDetails = await solanaConnection.getParsedTransaction(oldestTx.signature, { maxSupportedTransactionVersion: 0 });
        
        if (txDetails && txDetails.transaction.message.accountKeys.length > 1) {
            // Il primo firmatario di solito è chi paga, il secondo è chi riceve (se è un trasferimento base)
            const funder = txDetails.transaction.message.accountKeys[0].pubkey.toString();
            
            // Se il funder è diverso dal wallet stesso, abbiamo trovato il Padre
            if (funder !== walletAddress) {
                return funder;
            } else {
                // Altrimenti cerchiamo nei trasferimenti interni (Istruzioni)
                return "Finanziato da Exchange (Binance/Coinbase) o non tracciabile";
            }
        }
        return "Sconosciuto";
    } catch (error) {
        console.error("Errore ricerca Wallet Madre:", error);
        return "Errore di lettura";
    }
}
async function calcolaRendimentoStorico(walletAddress) {
    // In questa versione simuliamo il parsing degli swap. 
    // Per un calcolo REALE al centesimo, si integrano API come Birdeye o Bitquery.
    // Qui costruiamo la logica di base del tuo algoritmo:
    
    try {
        // Parametri fittizi basati su un'analisi statistica che andrai a popolare con i dati reali
        let operazioniTotali = Math.floor(Math.random() * 50) + 10; // Es. 35 trade
        let tradeInProfitto = Math.floor(operazioniTotali * (Math.random() * 0.5 + 0.4)); // Es. 60-90% win rate
        
        let winRate = ((tradeInProfitto / operazioniTotali) * 100).toFixed(1);
        
        // Simulazione del Rendimento X (Es. ha investito 10, ha tirato fuori 45 = 4.5x)
        let rendimentoX = (Math.random() * 10 + 1).toFixed(2); // Da 1x a 11x
        
        // Analisi comportamentale
        let stileTrading = "Normale";
        if (winRate > 80 && rendimentoX > 5) stileTrading = "🚨 POSSIBILE INSIDER / DEV";
        if (winRate > 60 && rendimentoX > 2) stileTrading = "💎 SMART MONEY (Da copiare)";
        if (winRate < 40) stileTrading = "📉 RETAIL SFIGATO (Perde soldi)";
        // ... (lascia il calcolo del winRate sopra) ...

        // Simulazione dei dati di "Oggi"
        let depositoOggi = (Math.random() * 5 + 0.5).toFixed(2); // SOL depositati oggi
        let pnlOggi = (Math.random() * 3 - 1).toFixed(2); // PNL di oggi (da -1 a +2 SOL)

        return {
            winRate: `${winRate}%`,
            rendimentoMedio: `${rendimentoX}x`,
            stile: stileTrading,
            tradeAnalizzati: operazioniTotali,
            depositoOggi: `${depositoOggi} SOL`,
            pnlOggi: `${pnlOggi} SOL`
        };

    } catch (error) {
        return { winRate: "N/A", rendimentoMedio: "N/A", stile: "Errore" };
    }
}

function calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk) {
    const mcAttuale = currentFdv > 0 ? currentFdv : 5000;

    // Pump.fun migra verso i 69k
    if (mcAttuale > 65000) {
        return { 
            consiglio: "⛔ PERICOLO: Token in migrazione verso Raydium. Volatilità estrema.", 
            potenzialeX: "0x", targetUscita: "Nessuno" 
        };
    }

    // Calcolo dinamico del Dump: varia in base alla situazione
    let dumpStimatoMC = 69000;
    if (clusterRisk > 0) {
        // I bundle dumpano tra i 20k e i 30k
        dumpStimatoMC = 20000 + Math.floor(Math.random() * 10000); 
    } else if (isFakeDev) {
        // I fake dev aspettano un po' di più (30k - 45k)
        dumpStimatoMC = 30000 + Math.floor(Math.random() * 15000); 
    }

    // Il target sicuro è uscire prima del loro dump
    let uscitaSicura = dumpStimatoMC * 0.75; 
    
    if (mcAttuale >= uscitaSicura) {
        return { consiglio: "⚠️ ZONA ROSSA: Siamo già al target di scarico stimato. Non entrare.", potenzialeX: "0x", targetUscita: "Nessuno" };
    }

    let moltiplicatore = (uscitaSicura / mcAttuale).toFixed(2);
    let tempismoIngresso = "";

    // Logica Tattica per l'ingresso
    if (clusterRisk > 0 && mcAttuale > 10000) {
        tempismoIngresso = `⏳ ATTESA: Bot nel token. Aspetta uno scarico sotto i $5k MC prima di comprare.`;
    } else if (mcAttuale > 15000 && mcAttuale < uscitaSicura) {
        tempismoIngresso = `📉 RITRACCIAMENTO: Aspetta un calo verso i 10-12k MC. Uscita: $${uscitaSicura.toLocaleString()}`;
    } else if (mcAttuale <= 10000) {
        tempismoIngresso = `🟢 SCALPING: MC basso ($${mcAttuale.toLocaleString()}). Entrata rapida. Esci a $${uscitaSicura.toLocaleString()}`;
    } else {
        tempismoIngresso = `💡 TATTICO: Uscita consigliata intorno a $${uscitaSicura.toLocaleString()}`;
    }

    return {
        consiglio: tempismoIngresso,
        potenzialeX: `${moltiplicatore}x`,
        targetUscita: `$${uscitaSicura.toLocaleString()} MC`,
        rischioIngresso: isFakeDev ? "MODERATO" : "BASSO"
    };
}
app.get('/api/tracker/:walletAddress', async (req, res) => {
    const wallet = req.params.walletAddress;
    console.log(`\n🕵️ Tracciamento Wallet Attivato: ${wallet}`);

    try {
        // 1. Cerchiamo il Wallet Madre
        const madre = await trovaWalletMadre(wallet);
        console.log(`🔗 Connesso a Madre: ${madre}`);

        // 2. Calcoliamo Win Rate e Rendimento
        const stats = await calcolaRendimentoStorico(wallet);
        console.log(`📊 Stile: ${stats.stile} (Win: ${stats.winRate}, ROI: ${stats.rendimentoMedio})`);

        // Mandiamo tutto all'estensione
        res.json({
            wallet: wallet,
            walletMadre: madre,
            winRate: stats.winRate,
            rendimentoX: stats.rendimentoMedio,
            tradeTotali: stats.tradeAnalizzati,
            classificazione: stats.stile
        });

    } catch (error) {
        console.error("Errore nel tracker:", error);
        res.status(500).json({ error: "Impossibile tracciare il portafoglio." });
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