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



// =====================================================================
// 1. ANALISI DEL BUNDLE INIZIALE (Slot-0 & Bot di Volume)
// =====================================================================
async function analizzaBotEarlyLaunch(mintPubKey) {
    try {
        const mintAddress = new PublicKey(mintPubKey);
        
        const signatures = await solanaConnection.getSignaturesForAddress(mintAddress, { limit: 20 });
        if (signatures.length === 0) {
            return { potenzialeVolumeBot: "BASSO", bundleSlot0: false, supplyBundledPct: 0, funderComune: null, indicatoreTesto: "Nessun dato." };
        }

        let blockTimes = [];
        let funderMap = {};
        let sameBlockTxCount = 0;

        for (let i = signatures.length - 1; i >= 0; i--) {
            const sigInfo = signatures[i];
            if (sigInfo.blockTime) blockTimes.push(sigInfo.blockTime);

            const tx = await solanaConnection.getParsedTransaction(sigInfo.signature, { maxSupportedTransactionVersion: 0 });
            if (tx && tx.transaction && tx.transaction.message.accountKeys.length > 1) {
                const funder = tx.transaction.message.accountKeys[1].pubkey.toString();
                funderMap[funder] = (funderMap[funder] || 0) + 1;
            }
        }

        if (blockTimes.length > 1) {
            const primoTempo = blockTimes[0];
            sameBlockTxCount = blockTimes.filter(t => t === primoTempo || Math.abs(t - primoTempo) <= 1).length;
        }

        let masterWallet = null;
        for (const [funder, count] of Object.entries(funderMap)) {
            if (count >= 2) { masterWallet = funder; break; }
        }

        let supplyBundledPct = 0;
        try {
            const largestAccs = await solanaConnection.getTokenLargestAccounts(mintAddress);
            if (largestAccs.value.length > 1) {
                let totalTop = 0;
                for (let k = 1; k < Math.min(6, largestAccs.value.length); k++) {
                    if (largestAccs.value[k]) totalTop += largestAccs.value[k].uiAmount;
                }
                supplyBundledPct = parseFloat(((totalTop / 1000000000) * 100).toFixed(1));
            }
        } catch (e) {}

        let punteggioBot = 0;
        if (sameBlockTxCount >= 3) punteggioBot += 40; 
        if (masterWallet) punteggioBot += 35;          
        if (supplyBundledPct >= 15) punteggioBot += 25; 

        let livelloVolume = "BASSO";
        let indicatore = "🔴 Nessun pattern bot rilevato a 2k MC.";

        if (punteggioBot >= 70) {
            livelloVolume = "MOLTO ALTO (SNIPE READY)";
            indicatore = `🚀 BOT PUMP PRONTO: ${sameBlockTxCount} buy nello stesso blocco. Fanno finto volume.`;
        } else if (punteggioBot >= 40) {
            livelloVolume = "MODERATO";
            indicatore = `🟡 BOT MODERATI: Rilevati acquisti raggruppati. Possibile spinta a breve.`;
        }

        return {
            potenzialeVolumeBot: livelloVolume,
            bundleSlot0: sameBlockTxCount >= 3,
            supplyBundledPct: supplyBundledPct,
            funderComune: masterWallet,
            indicatoreTesto: indicatore
        };

    } catch (error) {
        return { potenzialeVolumeBot: "NON DISPONIBILE", bundleSlot0: false, supplyBundledPct: 0, funderComune: null, indicatoreTesto: "Errore blocco 0." };
    }
}

// =====================================================================
// 2. SIMULATORE DI PROFITTO E RIMBALZO (Wash Trading)
// =====================================================================
function calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk, bundleSupplyPct = 0, bundleStoricoX = 0) {
    const mcAttuale = currentFdv > 0 ? currentFdv : 5000;
    
    let risultato = { testo: "", mostraGrafico: false, datiGrafico: null, tradeValido: true, simulatoreTesto: "", moltiplicatore: 0, targetMC: 0 };
    let nostraUscita = 0;

    if (mcAttuale > 65000) {
        nostraUscita = Math.floor(mcAttuale * 1.25); 
        risultato.testo = `📈 Simulazione: ⚡ TOKEN MIGRATO. Usa i bot di volume a tuo vantaggio: entra ora e prendi un rapido +25% sui finti scambi. Esci a $${nostraUscita.toLocaleString()} MC.`;
    }
    else if (clusterRisk > 0 && bundleSupplyPct > 0) {
        let stimaIngressoBundle = 4500; 
        let targetDumpMC = stimaIngressoBundle * bundleStoricoX; 

        if (bundleSupplyPct < 20 && targetDumpMC > 20000) targetDumpMC = 10000 + (bundleSupplyPct * 350); 
        if (isFakeDev && targetDumpMC > 14000) targetDumpMC = 13500; 

        const targetDumpMC_Rounded = Math.floor(targetDumpMC);
        const uscitaIdeale = Math.floor(targetDumpMC_Rounded * 0.75); 

        if (mcAttuale >= targetDumpMC_Rounded) {
            nostraUscita = Math.floor(mcAttuale * 1.35); 
            risultato.testo = `📈 Simulazione: 📉 POST-DUMP. I bot fanno finti acquisti (Wash Trading). ⚡ Compra il calo e scappa a +35% ($${nostraUscita.toLocaleString()} MC).`;
        } else if (mcAttuale >= uscitaIdeale) {
            nostraUscita = Math.floor(mcAttuale * 1.15); 
            risultato.testo = `📈 Simulazione: ⚠️ DUMP IMMINENTE. Sfrutta l'ultimo sprint dei bot. ⚡ Entra e scappa istantaneamente a +15% ($${nostraUscita.toLocaleString()} MC). NON ESSERE AVIDO.`;
        } else {
            nostraUscita = uscitaIdeale;
            risultato.testo = `📈 Simulazione: 🟢 VANTAGGIO. Il manipolatore pomperà fino a ~$${targetDumpMC_Rounded.toLocaleString()} MC. Esci a ${nostraUscita.toLocaleString()}$ MC.`;
        }
    } 
    else if (isFakeDev) {
        if (mcAttuale > 11000) {
            nostraUscita = Math.floor(mcAttuale * 1.20); 
            risultato.testo = `📈 Simulazione: 🛑 FAKE DEV ($${mcAttuale.toLocaleString()} MC). Sta per ruggare. ⚡ Entra per la volatilità estrema e VENDI A +20% ($${nostraUscita.toLocaleString()}).`;
        } else {
            nostraUscita = 10000;
            risultato.testo = `📈 Simulazione: 🛑 FAKE DEV. 🟢 SCALPING RAPIDO. Take Profit a 10k MC, poi scappa.`;
        }
    } else {
        nostraUscita = Math.max(15000, Math.floor(mcAttuale * 1.40));
        if (mcAttuale < 15000) {
            risultato.testo = `📈 Simulazione: ✅ ORGANICO. Entrata pulita. Target: 15k MC.`;
        } else {
            risultato.testo = `📈 Simulazione: ✅ ORGANICO. Gioca l'onda lunga. Target: $${nostraUscita.toLocaleString()} MC.`;
        }
    }

    risultato.targetMC = nostraUscita;
    risultato.moltiplicatore = (nostraUscita / mcAttuale);
    const ritornoSol = risultato.moltiplicatore.toFixed(2);
    const nettoSol = (ritornoSol - 1).toFixed(2);
    risultato.simulatoreTesto = `Entri ora ➔ Esci a ${(nostraUscita/1000).toFixed(1)}k MC ➔ Incassi ${ritornoSol} SOL (+${nettoSol} netti)`;
    
    return risultato;
}

async function calcolaEtaWallet(walletAddress) {
    try {
        const signatures = await solanaConnection.getSignaturesForAddress(new PublicKey(walletAddress), { limit: 1000 });
        if (signatures.length === 0) return 0; 
        const oldestTx = signatures[signatures.length - 1];
        if (oldestTx.blockTime) return (Date.now() - (oldestTx.blockTime * 1000)) / (1000 * 60 * 60 * 24);
        return null;
    } catch (e) { return null; }
}

// =====================================================================
// 3. ROTTA PRINCIPALE (Scansione Estensione)
// =====================================================================
app.get('/api/scan/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;

    try {
        console.log(`\n🔍 Scansione Avanzata ON-CHAIN per: ${tokenMint}`);
        const mintPubKey = new PublicKey(tokenMint);

        const earlyBotData = await analizzaBotEarlyLaunch(mintPubKey);

        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
        const data = await response.json();
        let currentFdv = (data.pairs && data.pairs.length > 0) ? data.pairs[0].fdv : 0;

        const signatures = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 100 });
        let walletAgeDays = null;
        let isFakeDev = false;
        let logAnalisi = [];

        if (signatures.length > 0) {
            const launchTx = signatures[signatures.length - 1];
            const txDetails = await solanaConnection.getParsedTransaction(launchTx.signature, { maxSupportedTransactionVersion: 0 });
            if (txDetails && txDetails.transaction.message.accountKeys.length > 0) {
                const devWallet = txDetails.transaction.message.accountKeys[0].pubkey.toString();
                walletAgeDays = await calcolaEtaWallet(devWallet);
                if (walletAgeDays !== null && walletAgeDays < 1) {
                    isFakeDev = true;
                    logAnalisi.push("🛑 FAKE DEV: Wallet creato da meno di 24 ore!");
                }
            }
        }

        logAnalisi.push(earlyBotData.indicatoreTesto);

        const clusterRisk = earlyBotData.bundleSlot0 ? 80 : 0;
        const simulazione = calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk, earlyBotData.supplyBundledPct, 3.5);
        logAnalisi.push(simulazione.testo);

        let solPriceUsd = 150;
        try {
            const solResp = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
            const solData = await solResp.json();
            if (solData.price) solPriceUsd = parseFloat(solData.price);
        } catch(e) {}

        let finalScore = isFakeDev ? 70 : (earlyBotData.bundleSlot0 ? 60 : 20);
        let rischioStatus = finalScore >= 70 ? "ALTO / BOT" : "MODERATO";

        res.json({
            score: finalScore,
            rischio: rischioStatus,
            dettagli: logAnalisi,
            graficoAttivo: false, // Disattivato temporaneamente per usare il layout Early Radar
            datiGrafico: null,
            // SEZIONE SPECIALIZZATA "EARLY BOT SNIPER"
            earlyRadar: {
                potenzialeVolume: earlyBotData.potenzialeVolumeBot,
                bundleSlot0: earlyBotData.bundleSlot0,
                supplyBot: earlyBotData.supplyBundledPct,
                // 🔥 Modifica qui: passiamo l'indirizzo INTERO, non tagliato!
                masterWalletFull: earlyBotData.funderComune || "Nessuno",
                masterWallet: earlyBotData.funderComune ? `${earlyBotData.funderComune.substring(0,4)}...${earlyBotData.funderComune.slice(-4)}` : "Nessuno"
            },
            tradeValido: simulazione.tradeValido,
            simulatoreTesto: simulazione.simulatoreTesto,
            moltiplicatore: simulazione.moltiplicatore,
            targetMC: simulazione.targetMC,
            prezzoSol: solPriceUsd
        });

    } catch (error) {
        console.error("Errore durante la scansione:", error);
        res.status(500).json({ error: "Errore durante la scansione del token." });
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

function calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk, bundleSupplyPct = 0, bundleStoricoX = 0) {
    const mcAttuale = currentFdv > 0 ? currentFdv : 5000;
    
    let risultato = { testo: "", mostraGrafico: false, datiGrafico: null, tradeValido: true, simulatoreTesto: "", moltiplicatore: 0, targetMC: 0 };

    let nostraUscita = 0;

    if (mcAttuale > 65000) {
        nostraUscita = Math.floor(mcAttuale * 1.25); // Rimbalzo su Raydium del 25%
        risultato.testo = `📈 Simulazione: ⚡ TOKEN MIGRATO. Usa i bot di volume a tuo vantaggio: entra ora e prendi un rapido +25% sui finti scambi. Esci a $${nostraUscita.toLocaleString()} MC.`;
    }
    else if (clusterRisk > 0 && bundleSupplyPct > 0) {
        let stimaIngressoBundle = 4500; 
        let targetDumpMC = stimaIngressoBundle * bundleStoricoX; 

        if (bundleSupplyPct < 20 && targetDumpMC > 20000) targetDumpMC = 10000 + (bundleSupplyPct * 350); 
        if (isFakeDev && targetDumpMC > 14000) targetDumpMC = 13500; 

        const targetDumpMC_Rounded = Math.floor(targetDumpMC);
        const uscitaIdeale = Math.floor(targetDumpMC_Rounded * 0.75); 

        if (mcAttuale >= targetDumpMC_Rounded) {
            // IL PREZZO E' GIA' CROLLATO - GIOCHIAMO IL RIMBALZO
            nostraUscita = Math.floor(mcAttuale * 1.35); // I bot ricompreranno per il finto pump (Rimbalzo del 35%)
            risultato.testo = `📈 Simulazione: 📉 POST-DUMP. I bot hanno scaricato, ma faranno finti acquisti (Wash Trading). ⚡ Compra il calo e scappa a +35% ($${nostraUscita.toLocaleString()} MC).`;
        } else if (mcAttuale >= uscitaIdeale) {
            // TERRA DI NESSUNO: GIOCHIAMO CORTISSIMO
            nostraUscita = Math.floor(mcAttuale * 1.15); // Scalp estremo del 15%
            risultato.testo = `📈 Simulazione: ⚠️ DUMP IMMINENTE. Sfrutta l'ultimo sprint dei bot. ⚡ Entra e scappa istantaneamente a +15% ($${nostraUscita.toLocaleString()} MC). NON ESSERE AVIDO.`;
        } else {
            nostraUscita = uscitaIdeale;
            risultato.testo = `📈 Simulazione: 🟢 VANTAGGIO. Il manipolatore pomperà fino a ~$${targetDumpMC_Rounded.toLocaleString()} MC. Esci a ${nostraUscita.toLocaleString()}$ MC.`;
        }
    } 
    else if (isFakeDev) {
        if (mcAttuale > 11000) {
            nostraUscita = Math.floor(mcAttuale * 1.20); // Rimbalzo del 20% anche se è altissimo
            risultato.testo = `📈 Simulazione: 🛑 FAKE DEV ($${mcAttuale.toLocaleString()} MC). Sta per ruggare. ⚡ Entra per la volatilità estrema e VENDI A +20% ($${nostraUscita.toLocaleString()}).`;
        } else {
            nostraUscita = 10000;
            risultato.testo = `📈 Simulazione: 🛑 FAKE DEV. 🟢 SCALPING RAPIDO. I bot creeranno il primo spike. Take Profit a 10k MC, poi scappa.`;
        }
    } else {
        nostraUscita = Math.max(15000, Math.floor(mcAttuale * 1.40));
        if (mcAttuale < 15000) {
            risultato.testo = `📈 Simulazione: ✅ ORGANICO. Entrata pulita. Target: 15k MC.`;
        } else {
            risultato.testo = `📈 Simulazione: ✅ ORGANICO. Gioca l'onda lunga. Target: $${nostraUscita.toLocaleString()} MC.`;
        }
    }

    // CALCOLO UNIVERSALE (Sempre attivo)
    risultato.targetMC = nostraUscita;
    risultato.moltiplicatore = (nostraUscita / mcAttuale);
    
    const ritornoSol = risultato.moltiplicatore.toFixed(2);
    const nettoSol = (ritornoSol - 1).toFixed(2);
    risultato.simulatoreTesto = `Entri ora ➔ Esci a ${(nostraUscita/1000).toFixed(1)}k MC ➔ Incassi ${ritornoSol} SOL (+${nettoSol} netti)`;
    
    return risultato;
}
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