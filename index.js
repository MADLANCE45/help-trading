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
// =====================================================================
// 2. SIMULATORE DI PROFITTO DINAMICO (Cervello Istituzionale)
// =====================================================================
// =====================================================================
// 2. SIMULATORE DI PROFITTO DINAMICO (Cervello Istituzionale Anti-Lag)
// =====================================================================
function calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk, bundleSupplyPct, tokenAgeMinutes) {
    // 🔥 FIX: Se non riusciamo a leggere il Market Cap reale, ci fermiamo. Niente più numeri inventati a caso.
    if (!currentFdv || currentFdv <= 0) {
        return {
            testo: "📈 Simulazione: ⏳ IN ATTESA DI DATI LIVE. Il token è troppo nuovo o le API stanno laggando. Aggiorna tra 5 secondi.",
            tradeValido: false,
            simulatoreTesto: "⛔ CALCOLATORE IN PAUSA: Market Cap reale non ancora sincronizzato.",
            azione: "ATTESA DATI",
            coloreAzione: "#888",
            moltiplicatore: 0,
            targetMC: 0
        };
    }

    const mcAttuale = currentFdv;
    let risultato = { testo: "", tradeValido: true, simulatoreTesto: "", moltiplicatore: 0, targetMC: 0, azione: "", coloreAzione: "", ctoStatus: "Basso" };
    let nostraUscita = 0;

    // 1. MEGA CABALA IN TRENDING (MC > 70k e Bot attivi)
    if (mcAttuale >= 70000 && (bundleSupplyPct >= 10 || clusterRisk > 0)) {
        nostraUscita = Math.floor(mcAttuale * 1.25); 
        risultato.azione = "RIDE THE WAVE (Cabala)";
        risultato.coloreAzione = "#ff007f"; 
        risultato.tradeValido = true;
        risultato.testo = `📈 Simulazione: 🦍 CABALA IN TRENDING ($${(mcAttuale/1000).toFixed(1)}k). I bot stanno forzando i volumi. ⚡ SCALPING RAPIDO. Target: $${nostraUscita.toLocaleString()} MC.`;
    }
    // 2. KILL SWITCH: BUNDLE NUCLEARE PRE-RAYDIUM (Supply > 20%)
    else if (bundleSupplyPct >= 20 && mcAttuale < 70000) {
        risultato.azione = "DUMP NUCLEARE IN CORSO";
        risultato.coloreAzione = "#ff4d4d";
        risultato.tradeValido = false;
        risultato.testo = `📈 Simulazione: 🚨 BUNDLE MORTALE (${bundleSupplyPct}%). I bot possiedono troppa supply. ⛔ FUGA IMMEDIATA, azzeramento imminente.`;
        risultato.simulatoreTesto = `⛔ OPERAZIONE BLOCCATA: I bot ti prosciugheranno.`;
        return risultato; 
    }
    // 3. TRAPPOLA DEI FINTI VOLUMI (Wash Trading)
    else if (clusterRisk > 0 && bundleSupplyPct < 5) {
        risultato.azione = "WASH TRADING (Finti Volumi)";
        risultato.coloreAzione = "#ffaa00";
        risultato.tradeValido = false;
        risultato.testo = `📈 Simulazione: ⚠️ TRAPPOLA DEI VOLUMI ($${(mcAttuale/1000).toFixed(1)}k). Snipato blocco zero per creare FOMO. Volume finto. ⛔ NON ENTRARE.`;
        risultato.simulatoreTesto = `⛔ OPERAZIONE BLOCCATA: Volumi artificiali, rischio incastro al 99%.`;
        return risultato;
    }
    // 4. SCALPING SUI BOT (Bundle medio, 5-19% supply)
    else if (clusterRisk > 0 || bundleSupplyPct >= 5) {
        let targetDumpMC = mcAttuale + (bundleSupplyPct * 500); // Dinamico sul MC attuale
        if (targetDumpMC < mcAttuale * 1.10) targetDumpMC = mcAttuale * 1.20; 
        
        const targetDumpMC_Rounded = Math.floor(targetDumpMC);
        const uscitaIdeale = Math.floor(targetDumpMC_Rounded * 0.85); 

        nostraUscita = uscitaIdeale;
        risultato.azione = "FASE PUMP BOT (Scalp)";
        risultato.coloreAzione = "#00ffcc";
        risultato.testo = `📈 Simulazione: 🟢 MICRO-SCALPING ($${(mcAttuale/1000).toFixed(1)}k). 🛡️ Ruba i soldi ai bot uscendo prima di loro a: $${nostraUscita.toLocaleString()} MC.`;
    } 
    // 5. FAKE DEV
    else if (isFakeDev) {
        let maxTarget = mcAttuale > 25000 ? mcAttuale * 1.20 : 25000; 
        nostraUscita = Math.floor(mcAttuale * 1.25); 
        if (nostraUscita > maxTarget) nostraUscita = Math.floor(maxTarget);
        
        risultato.azione = "VOLATILITÀ FAKE DEV";
        risultato.coloreAzione = "#ffaa00";
        risultato.testo = `📈 Simulazione: 🛑 FAKE DEV ($${(mcAttuale/1000).toFixed(1)}k). 🟢 SCALPING ESTREMO. Sfrutta il finto hype e scappa a $${nostraUscita.toLocaleString()} MC.`;
    } 
    // 6. 100% ORGANICO E PULITO
    else {
        nostraUscita = Math.floor(mcAttuale * 1.35); // +35% calcolato sempre sul vero MC
        risultato.azione = "TREND ORGANICO PULITO";
        risultato.coloreAzione = "#00ffcc";
        risultato.testo = `📈 Simulazione: ✅ ORGANICO LEGITTIMO. Crescita pulita da $${(mcAttuale/1000).toFixed(1)}k MC. Target Trailing: $${nostraUscita.toLocaleString()} MC.`;
    }

    risultato.targetMC = nostraUscita;
    risultato.moltiplicatore = nostraUscita > 0 ? (nostraUscita / mcAttuale) : 0;
    
    if (risultato.tradeValido) {
        const ritornoSol = risultato.moltiplicatore.toFixed(2);
        const nettoSol = (ritornoSol - 1).toFixed(2);
        risultato.simulatoreTesto = `Entri a ${(mcAttuale/1000).toFixed(1)}k ➔ Esci a ${(nostraUscita/1000).toFixed(1)}k ➔ Incassi ${ritornoSol} SOL (+${nettoSol} netti)`;
    } else if (!risultato.simulatoreTesto) {
        risultato.simulatoreTesto = `⛔ OPERAZIONE BLOCCATA: Rischio matematico troppo elevato.`;
    }
    
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
// 3. RADAR DELLA VOLUME VELOCITY (Battito Cardiaco)
// =====================================================================
async function analizzaBattitoCardiaco(mintPubKey) {
    try {
        const signatures = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 50 });
        if (signatures.length === 0) return { stato: "MORTO", txMinuto: 0, colore: "#ff4d4d", blocco: true, secondiDaUltimaTx: 999 };

        const nowSec = Math.floor(Date.now() / 1000);
        let txInLast60s = 0;
        
        let lastTxTime = signatures[0].blockTime || nowSec; 
        let secondiDaUltimaTx = nowSec - lastTxTime;

        signatures.forEach(sig => {
            if (sig.blockTime && (nowSec - sig.blockTime <= 60)) {
                txInLast60s++;
            }
        });

        let stato = "";
        let colore = "";
        let blocco = false;

        if (secondiDaUltimaTx > 30 || txInLast60s < 5) {
            stato = "☠️ ZERO LIQUIDITÀ (Trappola)";
            colore = "#ff4d4d";
            blocco = true;
        } else if (txInLast60s < 15) {
            stato = "⚠️ MORENTE (Bassi scambi)";
            colore = "#ffaa00";
            blocco = false;
        } else if (txInLast60s < 40) {
            stato = "🟢 SANO (Buon ritmo)";
            colore = "#00e676";
            blocco = false;
        } else {
            stato = "🔥 IPER-ATTIVO (FOMO)";
            colore = "#00aaff";
            blocco = false;
        }

        return {
            stato: stato,
            txMinuto: txInLast60s,
            colore: colore,
            blocco: blocco,
            secondiDaUltimaTx: secondiDaUltimaTx > 0 ? secondiDaUltimaTx : 0
        };
    } catch (error) {
        return { stato: "ERRORE LETTURA", txMinuto: 0, colore: "#ff4d4d", blocco: true, secondiDaUltimaTx: 999 };
    }
}
// =====================================================================
// 5. RILEVATORE MICRO-DUMPING (Scudo Sanguisuga)
// =====================================================================
async function analizzaMicroDumping(mintPubKey) {
    try {
        const largestAccs = await solanaConnection.getTokenLargestAccounts(mintPubKey);
        // Serve almeno la pool e qualche holder per analizzare
        if (!largestAccs.value || largestAccs.value.length < 2) return null;

        // Escludiamo il primo (che al 99% è la Bonding Curve di Pump.fun o Raydium)
        // Analizziamo i successivi 4 top holders (dal 2° al 5°)
        const topHolders = largestAccs.value.slice(1, 5);
        let sanguisugheTrovate = 0;
        let totaleVenditeSanguisughe = 0;

        const analisiPromises = topHolders.map(async (acc) => {
            // Se ha meno dell'1% non ha abbastanza potere per fare danni devastanti
            if (acc.uiAmount < 10000000) return null;

            try {
                // Leggiamo le ultime 10 transazioni del Token Account
                const sigs = await solanaConnection.getSignaturesForAddress(new PublicKey(acc.address), { limit: 10 });
                if (sigs.length < 3) return null; // Se ha mosso poco, sta solo holdando

                const txs = await solanaConnection.getParsedTransactions(sigs.map(s => s.signature), { maxSupportedTransactionVersion: 0 });
                
                let vendite = 0;
                
                txs.forEach(tx => {
                    if (!tx || !tx.meta || !tx.transaction.message.accountKeys) return;
                    
                    // Cerchiamo il saldo del token account prima e dopo l'operazione
                    const preToken = tx.meta.preTokenBalances.find(b => {
                        const keyObj = tx.transaction.message.accountKeys[b.accountIndex];
                        return keyObj && keyObj.pubkey.toString() === acc.address;
                    });
                    const postToken = tx.meta.postTokenBalances.find(b => {
                        const keyObj = tx.transaction.message.accountKeys[b.accountIndex];
                        return keyObj && keyObj.pubkey.toString() === acc.address;
                    });
                    
                    if (preToken && postToken) {
                        // Se il bilancio finale è minore, significa che ha venduto o trasferito fuori
                        if (postToken.uiTokenAmount.uiAmount < preToken.uiTokenAmount.uiAmount) {
                            vendite++;
                        }
                    }
                });

                // 🔥 Se nelle ultime 10 transazioni ci sono state 3 o più vendite, è un Micro-Dumper (Sanguisuga)!
                if (vendite >= 3) {
                    sanguisugheTrovate++;
                    totaleVenditeSanguisughe += vendite;
                    return true;
                }
                return null;
            } catch (e) { return null; }
        });

        await Promise.all(analisiPromises);

        if (sanguisugheTrovate > 0) {
            return {
                pericolo: true,
                scoreAggiuntivo: 35,
                testo: `🩸 SCUDO SANGUISUGA: Rilevato Micro-Dumping! ${sanguisugheTrovate} Top Holder stanno frammentando le vendite (${totaleVenditeSanguisughe} micro-dump recenti). Ti stanno prosciugando lentamente. RUG LENTO IN CORSO.`
            };
        }

        return { pericolo: false, scoreAggiuntivo: 0, testo: `✅ SCUDO SANGUISUGA: Nessuna anomalia. I Top Holders non stanno farmando la liquidità.` };

    } catch (error) {
        return null;
    }
}

// =====================================================================
// 6. ROTTA PRINCIPALE (Scansione Estensione)
// =====================================================================
app.get('/api/scan/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;
    // 3. RECUPERO MARKET CAP ESATTO (Anti-Lag & Anti-Cloudflare)
        let currentFdv = 0;
        let pairCreatedAt = null; 
        
        // Tentativo 1: DexScreener (Funziona per token vecchi di almeno 2 minuti)
        try {
            const dexResp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
            const dexData = await dexResp.json();
            if (dexData.pairs && dexData.pairs.length > 0) {
                currentFdv = dexData.pairs[0].fdv || 0;
                pairCreatedAt = dexData.pairs[0].pairCreatedAt; 
            }
        } catch(e) {}

        // Tentativo 2: Pump.fun Live API (Mascheramento Browser per i token appena nati)
        if (currentFdv === 0 || currentFdv < 5000) {
            try {
                const pumpResp = await fetch(`https://frontend-api.pump.fun/coins/${tokenMint}`, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                        "Accept": "application/json",
                        "Accept-Language": "en-US,en;q=0.9",
                        "Origin": "https://pump.fun",
                        "Referer": "https://pump.fun/"
                    }
                });
                if (pumpResp.ok) {
                    const pumpData = await pumpResp.json();
                    if (pumpData && pumpData.usd_market_cap) {
                        currentFdv = pumpData.usd_market_cap;
                        if (pumpData.created_timestamp) pairCreatedAt = pumpData.created_timestamp;
                    }
                }
            } catch(e) {
                console.log("Pump.fun API temporaneamente inaccessibile");
            }
        }
    try {
        console.log(`\n🔍 Scansione Avanzata ON-CHAIN per: ${tokenMint}`);
        const mintPubKey = new PublicKey(tokenMint);

        // 🧠 A. L'Algoritmo esegue tutte le indagini incrociate
        const earlyBotData = await analizzaBotEarlyLaunch(mintPubKey);
        const velocityData = await analizzaBattitoCardiaco(mintPubKey);
        const cabalaData = await analizzaCabalaSupply(mintPubKey);
        const microDumpData = await analizzaMicroDumping(mintPubKey);

        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
        const data = await response.json();
        
        let currentFdv = 0;
        let pairCreatedAt = null; 
        
        if (data.pairs && data.pairs.length > 0) {
            currentFdv = data.pairs[0].fdv || 0;
            pairCreatedAt = data.pairs[0].pairCreatedAt; 
        }

        const signatures = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 100 });
        let walletAgeDays = null;
        let isFakeDev = false;
        let logAnalisi = [];

        let tokenAgeMinutes = 0;
        if (pairCreatedAt) {
            tokenAgeMinutes = (Date.now() - pairCreatedAt) / 60000;
        } else if (signatures.length > 0) {
            const oldestTx = signatures[signatures.length - 1];
            if (oldestTx.blockTime) tokenAgeMinutes = (Date.now() - (oldestTx.blockTime * 1000)) / 60000;
        }

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

        // 📋 B. Costruiamo il Report per l'estensione visiva
        logAnalisi.push(earlyBotData.indicatoreTesto);
        
        const segnaleECG = velocityData.blocco ? '🛑' : '✅';
        logAnalisi.push(`${segnaleECG} Battito Cardiaco: ${velocityData.txMinuto} tx/min (Ultima tx: ${velocityData.secondiDaUltimaTx}s fa) - ${velocityData.stato}`);

        if (cabalaData && cabalaData.testo) logAnalisi.push(cabalaData.testo);
        if (microDumpData && microDumpData.testo) logAnalisi.push(microDumpData.testo);

        const clusterRisk = earlyBotData.bundleSlot0 ? 80 : 0;
        let simulazione = calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk, earlyBotData.supplyBundledPct, tokenAgeMinutes);

        // 🛡️ C. INTERRUTTORI DI EMERGENZA (Kill Switches) 🛡️
        
        // Emergenza 1: Cabala (Gruppo criminale)
        if (cabalaData && cabalaData.pericolo) simulazione.tradeValido = false; 

        // Emergenza 2: Sanguisughe (Micro-Dumping)
        if (microDumpData && microDumpData.pericolo) {
            simulazione.tradeValido = false;
            simulazione.azione = "MICRO-DUMPING IN CORSO";
            simulazione.coloreAzione = "#ff4d4d";
            simulazione.testo = `📈 Simulazione: ☠️ TRAPPOLA LENTA. I Top Holders stanno svuotando la liquidità con micro-vendite. Fuggire.`;
            simulazione.simulatoreTesto = `⛔ OPERAZIONE BLOCCATA: Rischio prosciugamento capitale.`;
        }

        // Emergenza 3: Mancanza di Battito (La più importante sovrascrive tutto)
        if (velocityData.blocco) {
            simulazione.azione = "MORTO (Illiquido)";
            simulazione.coloreAzione = velocityData.colore;
            simulazione.tradeValido = false;
            simulazione.testo = `📈 Simulazione: ☠️ TRAPPOLA DI LIQUIDITÀ. Scambi fermi da ${velocityData.secondiDaUltimaTx} secondi. ⛔ NON COMPRARE.`;
            simulazione.simulatoreTesto = `⛔ OPERAZIONE BLOCCATA: Zero compratori attivi nel mercato.`;
        }

        logAnalisi.push(simulazione.testo);

        // 📈 D. Dati Globali (HUD)
        let memeChange24h = 0;
        let memeVolM = 0;
        let marketTrend = "Analisi...";
        let hudColor = "#fff";
        let marketIcon = "📊";

        try {
            const [wifResp, bonkResp] = await Promise.all([
                fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=WIFUSDT"),
                fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BONKUSDT")
            ]);
            const wifData = await wifResp.json();
            const bonkData = await bonkResp.json();
            
            const wifChange = parseFloat(wifData.priceChangePercent || 0);
            const bonkChange = parseFloat(bonkData.priceChangePercent || 0);
            const wifVol = parseFloat(wifData.quoteVolume || 0);
            const bonkVol = parseFloat(bonkData.quoteVolume || 0);
            
            memeChange24h = ((wifChange + bonkChange) / 2).toFixed(2);
            memeVolM = ((wifVol + bonkVol) / 1000000).toFixed(1);
            
            if (memeChange24h >= 3) {
                marketTrend = "RISK-ON (Meme Season)";
                hudColor = "#00e676"; 
                marketIcon = "🔥";
            } else if (memeChange24h <= -3) {
                marketTrend = "RISK-OFF (Sangue, Rugg)";
                hudColor = "#ff4d4d"; 
                marketIcon = "🩸";
            } else {
                marketTrend = "NEUTRO (Range laterale)";
                hudColor = "#ffaa00"; 
                marketIcon = "⚖️";
            }
        } catch(e) {
            marketIcon = "⚠️";
        }

        let solPriceUsd = 150;
        try {
            const solResp = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
            const solData = await solResp.json();
            if (solData.price) solPriceUsd = parseFloat(solData.price);
        } catch(e) {}

        // 🎯 E. Calcolo Punteggio Finale Rischio
        let finalScore = isFakeDev ? 70 : (earlyBotData.bundleSlot0 ? 60 : 20);
        
        // Applichiamo le penalità
        if (cabalaData) finalScore = Math.min(100, finalScore + cabalaData.scoreAggiuntivo);
        if (microDumpData) finalScore = Math.min(100, finalScore + microDumpData.scoreAggiuntivo);
        if (earlyBotData.supplyBundledPct >= 20) finalScore = 100; 
        if (velocityData.blocco) finalScore = Math.max(finalScore, 85); 

        let rischioStatus = finalScore >= 80 ? "ALTISSIMO / TRAPPOLA" : (finalScore >= 60 ? "ALTO / MANIPOLATO" : "MODERATO");

        res.json({
            score: finalScore,
            rischio: rischioStatus,
            dettagli: logAnalisi,
            graficoAttivo: false,
            datiGrafico: null,
            earlyRadar: {
                potenzialeVolume: earlyBotData.potenzialeVolumeBot,
                bundleSlot0: earlyBotData.bundleSlot0,
                supplyBot: earlyBotData.supplyBundledPct,
                masterWalletFull: earlyBotData.funderComune || "Nessuno",
                masterWallet: earlyBotData.funderComune ? `${earlyBotData.funderComune.substring(0,4)}...${earlyBotData.funderComune.slice(-4)}` : "Nessuno"
            },
            vitaToken: tokenAgeMinutes.toFixed(1),
            timeToRug: simulazione.azione, 
            ctoStatus: simulazione.ctoStatus, 
            fugaColor: simulazione.coloreAzione, 
            
            hud: {
                change: memeChange24h,
                volume: memeVolM,
                trend: marketTrend,
                color: hudColor,
                icon: marketIcon
            },

            tradeValido: simulazione.tradeValido,
            simulatoreTesto: simulazione.simulatoreTesto,
            moltiplicatore: simulazione.moltiplicatore,
            targetMC: simulazione.targetMC,
            prezzoSol: parseFloat(solPriceUsd)
        });

    } catch (error) {
        console.error("Errore durante la scansione:", error);
        res.status(500).json({ error: "Errore durante la scansione del token." });
    }
});
// =====================================================================
// 4. ROTTA PRINCIPALE (Scansione Estensione)
// =====================================================================
app.get('/api/scan/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;

    try {
        console.log(`\n🔍 Scansione Avanzata ON-CHAIN per: ${tokenMint}`);
        const mintPubKey = new PublicKey(tokenMint);

        const earlyBotData = await analizzaBotEarlyLaunch(mintPubKey);
        const velocityData = await analizzaBattitoCardiaco(mintPubKey);
        const cabalaData = await analizzaCabalaSupply(mintPubKey);

        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
        const data = await response.json();
        
        let currentFdv = 0;
        let pairCreatedAt = null; 
        
        if (data.pairs && data.pairs.length > 0) {
            currentFdv = data.pairs[0].fdv || 0;
            pairCreatedAt = data.pairs[0].pairCreatedAt; 
        }

        const signatures = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 100 });
        let walletAgeDays = null;
        let isFakeDev = false;
        let logAnalisi = [];

        let tokenAgeMinutes = 0;
        if (pairCreatedAt) {
            tokenAgeMinutes = (Date.now() - pairCreatedAt) / 60000;
        } else if (signatures.length > 0) {
            const oldestTx = signatures[signatures.length - 1];
            if (oldestTx.blockTime) tokenAgeMinutes = (Date.now() - (oldestTx.blockTime * 1000)) / 60000;
        }

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
        
        // 🔥 INIEZIONE VISIVA DELL'ELETTROCARDIOGRAMMA 🔥
        const segnaleECG = velocityData.blocco ? '🛑' : '✅';
        logAnalisi.push(`${segnaleECG} Battito Cardiaco: ${velocityData.txMinuto} tx/min (Ultima tx: ${velocityData.secondiDaUltimaTx}s fa) - ${velocityData.stato}`);
        if (cabalaData && cabalaData.testo) {
    logAnalisi.push(cabalaData.testo);
}
        const clusterRisk = earlyBotData.bundleSlot0 ? 80 : 0;
        let simulazione = calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk, earlyBotData.supplyBundledPct, tokenAgeMinutes);

        // BLOCCO DI EMERGENZA
        if (velocityData.blocco) {
            simulazione.azione = "MORTO (Illiquido)";
            simulazione.coloreAzione = velocityData.colore;
            simulazione.tradeValido = false;
            simulazione.testo = `📈 Simulazione: ☠️ TRAPPOLA DI LIQUIDITÀ. Scambi fermi da ${velocityData.secondiDaUltimaTx} secondi. ⛔ NON COMPRARE.`;
            simulazione.simulatoreTesto = `⛔ OPERAZIONE BLOCCATA: Zero compratori attivi nel mercato.`;
        }

        logAnalisi.push(simulazione.testo);

        let memeChange24h = 0;
        let memeVolM = 0;
        let marketTrend = "Analisi...";
        let hudColor = "#fff";
        let marketIcon = "📊";

        try {
            const [wifResp, bonkResp] = await Promise.all([
                fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=WIFUSDT"),
                fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BONKUSDT")
            ]);
            const wifData = await wifResp.json();
            const bonkData = await bonkResp.json();
            
            const wifChange = parseFloat(wifData.priceChangePercent || 0);
            const bonkChange = parseFloat(bonkData.priceChangePercent || 0);
            const wifVol = parseFloat(wifData.quoteVolume || 0);
            const bonkVol = parseFloat(bonkData.quoteVolume || 0);
            
            memeChange24h = ((wifChange + bonkChange) / 2).toFixed(2);
            memeVolM = ((wifVol + bonkVol) / 1000000).toFixed(1);
            
            if (memeChange24h >= 3) {
                marketTrend = "RISK-ON (Meme Season)";
                hudColor = "#00e676"; 
                marketIcon = "🔥";
            } else if (memeChange24h <= -3) {
                marketTrend = "RISK-OFF (Sangue, Rugg)";
                hudColor = "#ff4d4d"; 
                marketIcon = "🩸";
            } else {
                marketTrend = "NEUTRO (Range laterale)";
                hudColor = "#ffaa00"; 
                marketIcon = "⚖️";
            }
        } catch(e) {
            marketIcon = "⚠️";
        }

        let solPriceUsd = 150;
        try {
            const solResp = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
            const solData = await solResp.json();
            if (solData.price) solPriceUsd = parseFloat(solData.price);
        } catch(e) {}

        let finalScore = isFakeDev ? 70 : (earlyBotData.bundleSlot0 ? 60 : 20);
        
        // Penalità estreme per Scudo Supply e Battito
        if (cabalaData) finalScore = Math.min(100, finalScore + cabalaData.scoreAggiuntivo);
        if (earlyBotData.supplyBundledPct >= 20) finalScore = 100; // Bundle oltre il 20% è morte certa
        if (velocityData.blocco) finalScore = Math.max(finalScore, 85); 

        let rischioStatus = finalScore >= 80 ? "ALTISSIMO / RUG" : (finalScore >= 60 ? "ALTO / BOT" : "MODERATO");
        
        // Se lo Scudo Supply trova pericolo, l'algoritmo SPEGNE il calcolatore
        if (cabalaData && cabalaData.pericolo) simulazione.tradeValido = false;

        res.json({
            score: finalScore,
            rischio: rischioStatus,
            dettagli: logAnalisi,
            graficoAttivo: false,
            datiGrafico: null,
            earlyRadar: {
                potenzialeVolume: earlyBotData.potenzialeVolumeBot,
                bundleSlot0: earlyBotData.bundleSlot0,
                supplyBot: earlyBotData.supplyBundledPct,
                masterWalletFull: earlyBotData.funderComune || "Nessuno",
                masterWallet: earlyBotData.funderComune ? `${earlyBotData.funderComune.substring(0,4)}...${earlyBotData.funderComune.slice(-4)}` : "Nessuno"
            },
            vitaToken: tokenAgeMinutes.toFixed(1),
            timeToRug: simulazione.azione, 
            ctoStatus: simulazione.ctoStatus, 
            fugaColor: simulazione.coloreAzione, 
            
            hud: {
                change: memeChange24h,
                volume: memeVolM,
                trend: marketTrend,
                color: hudColor,
                icon: marketIcon
            },

            tradeValido: simulazione.tradeValido,
            simulatoreTesto: simulazione.simulatoreTesto,
            moltiplicatore: simulazione.moltiplicatore,
            targetMC: simulazione.targetMC,
            prezzoSol: parseFloat(solPriceUsd)
        });

    } catch (error) {
        console.error("Errore durante la scansione:", error);
        res.status(500).json({ error: "Errore durante la scansione del token." });
    }
    
});

// =====================================================================
// 4. LO SCUDO DELLA SUPPLY (Investigatore di Cabale e Alberi Genealogici)
// =====================================================================
// Funzione di pausa intelligente per aggirare l'errore 429 di Helius
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =====================================================================
// 4. LO SCUDO DELLA SUPPLY (Ottimizzato Anti-429)
// =====================================================================
async function analizzaCabalaSupply(mintPubKey) {
    try {
        const largestAccs = await solanaConnection.getTokenLargestAccounts(mintPubKey);
        if (!largestAccs.value || largestAccs.value.length === 0) return null;

        const topAccounts = largestAccs.value.slice(0, 10);
        let cabalaMap = {}; 
        let sybilCount = 0; 
        let risultati = [];

        // Eseguiamo il ciclo in serie con una pausa per non far arrabbiare Helius (Errore 429)
        for (let acc of topAccounts) {
            if (acc.uiAmount < 5000000) continue; 
            const pct = (acc.uiAmount / 1000000000) * 100;

            try {
                await delay(250); // ⏱️ PAUSA SALVAVITA ANTI-CRASH
                const accountInfo = await solanaConnection.getParsedAccountInfo(new PublicKey(acc.address));
                if (!accountInfo.value || !accountInfo.value.data.parsed) continue;
                
                const ownerWallet = accountInfo.value.data.parsed.info.owner;
                
                await delay(250); // ⏱️ PAUSA SALVAVITA
                const sigs = await solanaConnection.getSignaturesForAddress(new PublicKey(ownerWallet), { limit: 50 });
                if(sigs.length === 0) continue;

                if (sigs.length < 5) sybilCount++;
                
                const oldestTx = sigs[sigs.length - 1]; 
                
                await delay(250); // ⏱️ PAUSA SALVAVITA
                const txDetails = await solanaConnection.getParsedTransaction(oldestTx.signature, { maxSupportedTransactionVersion: 0 });
                
                let funder = "Sconosciuto";
                if (txDetails && txDetails.transaction.message.accountKeys.length > 1) {
                    funder = txDetails.transaction.message.accountKeys[0].pubkey.toString();
                    if (funder === ownerWallet || txDetails.transaction.message.accountKeys.length > 10) {
                       funder = "Exchange/Auto-finanziato";
                    }
                }
                risultati.push({ owner: ownerWallet, funder: funder, pct: pct });
            } catch (e) { continue; }
        }

        for (let res of risultati) {
            if (!res || res.funder === "Exchange/Auto-finanziato" || res.funder === "Sconosciuto") continue;
            if (!cabalaMap[res.funder]) cabalaMap[res.funder] = { pct: 0, count: 0 };
            cabalaMap[res.funder].pct += res.pct;
            cabalaMap[res.funder].count++;
        }

        let maxPct = 0;
        let worstCabal = null;
        for (const [funder, data] of Object.entries(cabalaMap)) {
            if (data.count >= 2 && data.pct > maxPct) { 
                maxPct = data.pct;
                worstCabal = { funder, pct: data.pct, count: data.count };
            }
        }

        if (sybilCount >= 3) {
            return { pericolo: true, scoreAggiuntivo: 50, testo: `🚨 ATTACCO SYBIL: ${sybilCount} Top Holders sono portafogli fantasma. RUG IMMINENTE.` };
        }

        if (worstCabal && worstCabal.pct >= 15) {
            return { pericolo: true, scoreAggiuntivo: 40, testo: `🚨 SCUDO SUPPLY: ${worstCabal.count} Top Holders (${worstCabal.pct.toFixed(1)}%) manovrati dallo stesso Dev.` };
        }

        return { pericolo: false, scoreAggiuntivo: 0, testo: `✅ SCUDO SUPPLY: Nessun attacco Sybil o Cabala.` };
    } catch (error) { return null; }
}

// =====================================================================
// 5. RILEVATORE MICRO-DUMPING (Ottimizzato Anti-429)
// =====================================================================
async function analizzaMicroDumping(mintPubKey) {
    try {
        const largestAccs = await solanaConnection.getTokenLargestAccounts(mintPubKey);
        if (!largestAccs.value || largestAccs.value.length < 2) return null;

        const topHolders = largestAccs.value.slice(1, 4); // Limitato a 3 per velocità
        let sanguisugheTrovate = 0;
        let totaleVenditeSanguisughe = 0;

        for (let acc of topHolders) {
            if (acc.uiAmount < 10000000) continue;

            try {
                await delay(250);
                const sigs = await solanaConnection.getSignaturesForAddress(new PublicKey(acc.address), { limit: 10 });
                if (sigs.length < 3) continue; 

                await delay(250);
                // Lettura massiva in blocco unico (Batching) per risparmiare limiti Helius
                const txs = await solanaConnection.getParsedTransactions(sigs.map(s => s.signature), { maxSupportedTransactionVersion: 0 });
                
                let vendite = 0;
                
                txs.forEach(tx => {
                    if (!tx || !tx.meta || !tx.transaction.message.accountKeys) return;
                    
                    const preToken = tx.meta.preTokenBalances.find(b => {
                        const keyObj = tx.transaction.message.accountKeys[b.accountIndex];
                        return keyObj && keyObj.pubkey.toString() === acc.address;
                    });
                    const postToken = tx.meta.postTokenBalances.find(b => {
                        const keyObj = tx.transaction.message.accountKeys[b.accountIndex];
                        return keyObj && keyObj.pubkey.toString() === acc.address;
                    });
                    
                    if (preToken && postToken) {
                        if (postToken.uiTokenAmount.uiAmount < preToken.uiTokenAmount.uiAmount) vendite++;
                    }
                });

                if (vendite >= 3) {
                    sanguisugheTrovate++;
                    totaleVenditeSanguisughe += vendite;
                }
            } catch (e) { continue; }
        }

        if (sanguisugheTrovate > 0) {
            return { pericolo: true, scoreAggiuntivo: 35, testo: `🩸 SCUDO SANGUISUGA: Rilevato Micro-Dumping (${totaleVenditeSanguisughe} vendite recenti dai Top Holders).` };
        }
        return { pericolo: false, scoreAggiuntivo: 0, testo: `✅ SCUDO SANGUISUGA: I Top Holders holdano pulito.` };
    } catch (error) { return null; }
}

// =====================================================================
// 6. ROTTA PRINCIPALE (Scansione Estensione)
// =====================================================================
// =====================================================================
// 6. ROTTA PRINCIPALE (Scansione Estensione - Versione Veloce & Pulita)
// =====================================================================
app.get('/api/scan/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;

    try {
        console.log(`\n🔍 Scansione Avanzata ON-CHAIN per: ${tokenMint}`);
        const mintPubKey = new PublicKey(tokenMint);

        // 1. EARLY EXIT (Velocità Massima): Controlliamo prima il battito. Se è morto, blocchiamo tutto subito.
        const velocityData = await analizzaBattitoCardiaco(mintPubKey);
        if (velocityData.blocco) {
            return res.json({
                score: 90,
                rischio: "ALTISSIMO / TRAPPOLA",
                dettagli: [`🛑 Battito Cardiaco: ${velocityData.txMinuto} tx/min (Ultima tx: ${velocityData.secondiDaUltimaTx}s fa) - MORTO`],
                graficoAttivo: false,
                vitaToken: "N/A",
                azione: "MORTO (Illiquido)",
                fugaColor: velocityData.colore,
                hud: { change: 0, volume: 0, trend: "N/A", color: "#444", icon: "💤" },
                tradeValido: false,
                simulatoreTesto: `⛔ OPERAZIONE BLOCCATA: Zero compratori attivi. Liquidi persi.`,
                moltiplicatore: 0,
                targetMC: 0,
                prezzoSol: 150
            });
        }

        // 2. Chiamate Parallele Ibride per scaricare i dati senza far arrabbiare Helius
        const earlyBotData = await analizzaBotEarlyLaunch(mintPubKey);
        await delay(300); // Respiro per Helius
        
        // 3. RECUPERO MARKET CAP ESATTO (Anti-Lag: Prima DexScreener, poi Pump.fun)
        let currentFdv = 0;
        let pairCreatedAt = null; 
        
        try {
            const dexResp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
            const dexData = await dexResp.json();
            if (dexData.pairs && dexData.pairs.length > 0) {
                currentFdv = dexData.pairs[0].fdv || 0;
                pairCreatedAt = dexData.pairs[0].pairCreatedAt; 
            }
        } catch(e) {}

        if (currentFdv === 0) {
            try {
                const pumpResp = await fetch(`https://frontend-api.pump.fun/coins/${tokenMint}`);
                if (pumpResp.ok) {
                    const pumpData = await pumpResp.json();
                    if (pumpData && pumpData.usd_market_cap) {
                        currentFdv = pumpData.usd_market_cap;
                        if (pumpData.created_timestamp) pairCreatedAt = pumpData.created_timestamp;
                    }
                }
            } catch(e) {}
        }

        // 4. Analisi Finale (Cabala e Sanguisughe)
        const cabalaData = await analizzaCabalaSupply(mintPubKey);
        await delay(300);
        const microDumpData = await analizzaMicroDumping(mintPubKey);

        const signatures = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 100 });
        let walletAgeDays = null;
        let isFakeDev = false;
        let logAnalisi = [];

        let tokenAgeMinutes = 0;
        if (pairCreatedAt) {
            tokenAgeMinutes = (Date.now() - pairCreatedAt) / 60000;
        } else if (signatures.length > 0) {
            const oldestTx = signatures[signatures.length - 1];
            if (oldestTx.blockTime) tokenAgeMinutes = (Date.now() - (oldestTx.blockTime * 1000)) / 60000;
        }

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

        // 5. Costruiamo il Terminale
        logAnalisi.push(earlyBotData.indicatoreTesto);
        logAnalisi.push(`✅ Battito Cardiaco: ${velocityData.txMinuto} tx/min (Ultima tx: ${velocityData.secondiDaUltimaTx}s fa) - ${velocityData.stato}`);
        if (cabalaData && cabalaData.testo) logAnalisi.push(cabalaData.testo);
        if (microDumpData && microDumpData.testo) logAnalisi.push(microDumpData.testo);

        const clusterRisk = earlyBotData.bundleSlot0 ? 80 : 0;
        
        // IL NUOVO CERVELLO SIMULATORE
        let simulazione = calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk, earlyBotData.supplyBundledPct, tokenAgeMinutes);

        // Kill Switches
        if (cabalaData && cabalaData.pericolo) simulazione.tradeValido = false; 
        if (microDumpData && microDumpData.pericolo) {
            simulazione.tradeValido = false;
            simulazione.azione = "MICRO-DUMPING IN CORSO";
            simulazione.coloreAzione = "#ff4d4d";
            simulazione.testo = `📈 Simulazione: ☠️ TRAPPOLA LENTA. I Top Holders stanno svuotando la liquidità con micro-vendite. Fuggire.`;
            simulazione.simulatoreTesto = `⛔ OPERAZIONE BLOCCATA: Rischio prosciugamento capitale.`;
        }

        logAnalisi.push(simulazione.testo);

        // Dati Globali Mercato
        let memeChange24h = 0; let memeVolM = 0; let marketTrend = "Analisi..."; let hudColor = "#fff"; let marketIcon = "📊";
        try {
            const [wifResp, bonkResp] = await Promise.all([ fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=WIFUSDT"), fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BONKUSDT") ]);
            const wifData = await wifResp.json(); const bonkData = await bonkResp.json();
            memeChange24h = (((parseFloat(wifData.priceChangePercent||0) + parseFloat(bonkData.priceChangePercent||0)) / 2)).toFixed(2);
            memeVolM = (((parseFloat(wifData.quoteVolume||0) + parseFloat(bonkData.quoteVolume||0)) / 1000000)).toFixed(1);
            if (memeChange24h >= 3) { marketTrend = "RISK-ON"; hudColor = "#00e676"; marketIcon = "🔥"; } 
            else if (memeChange24h <= -3) { marketTrend = "RISK-OFF"; hudColor = "#ff4d4d"; marketIcon = "🩸"; } 
            else { marketTrend = "NEUTRO"; hudColor = "#ffaa00"; marketIcon = "⚖️"; }
        } catch(e) {}

        let solPriceUsd = 150;
        try {
            const solResp = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
            const solData = await solResp.json();
            if (solData.price) solPriceUsd = parseFloat(solData.price);
        } catch(e) {}

        let finalScore = isFakeDev ? 70 : (earlyBotData.bundleSlot0 ? 60 : 20);
        if (cabalaData) finalScore = Math.min(100, finalScore + cabalaData.scoreAggiuntivo);
        if (microDumpData) finalScore = Math.min(100, finalScore + microDumpData.scoreAggiuntivo);
        if (earlyBotData.supplyBundledPct >= 20) finalScore = 100; 
        
        let rischioStatus = finalScore >= 80 ? "ALTISSIMO / TRAPPOLA" : (finalScore >= 60 ? "ALTO / MANIPOLATO" : "MODERATO");

        res.json({
            score: finalScore,
            rischio: rischioStatus,
            dettagli: logAnalisi,
            graficoAttivo: false,
            datiGrafico: null,
            earlyRadar: {
                potenzialeVolume: earlyBotData.potenzialeVolumeBot,
                bundleSlot0: earlyBotData.bundleSlot0,
                supplyBot: earlyBotData.supplyBundledPct,
                masterWalletFull: earlyBotData.funderComune || "Nessuno",
                masterWallet: earlyBotData.funderComune ? `${earlyBotData.funderComune.substring(0,4)}...${earlyBotData.funderComune.slice(-4)}` : "Nessuno"
            },
            vitaToken: tokenAgeMinutes.toFixed(1),
            azione: simulazione.azione, 
            ctoStatus: simulazione.ctoStatus, 
            fugaColor: simulazione.coloreAzione, 
            hud: { change: memeChange24h, volume: memeVolM, trend: marketTrend, color: hudColor, icon: marketIcon },
            tradeValido: simulazione.tradeValido,
            simulatoreTesto: simulazione.simulatoreTesto,
            moltiplicatore: simulazione.moltiplicatore,
            targetMC: simulazione.targetMC,
            prezzoSol: parseFloat(solPriceUsd)
        });

    } catch (error) { res.status(500).json({ error: "Errore API" }); }
});

// =====================================================================
// 7. LIVE SPY RADAR (Bug "0.00 SOL" Risolto, Lettura wSOL)
// =====================================================================
app.get('/api/spy-wallet/:walletAddress', async (req, res) => {
    try {
        const walletAddress = req.params.walletAddress;
        const pubKey = new PublicKey(walletAddress);
        
        const sigs = await solanaConnection.getSignaturesForAddress(pubKey, { limit: 10 });
        if (sigs.length === 0) return res.json({ actions: [] });

        const sigStrings = sigs.map(s => s.signature);
        const txs = await solanaConnection.getParsedTransactions(sigStrings, { maxSupportedTransactionVersion: 0 });

        let actions = [];
        let historicalBuysSol = [];

        for (let i = 0; i < txs.length; i++) {
            const tx = txs[i];
            const sigInfo = sigs[i]; 
            if (!tx || !tx.meta || !tx.meta.postTokenBalances) continue;

            const preBals = tx.meta.preTokenBalances.filter(b => b.owner === walletAddress);
            const postBals = tx.meta.postTokenBalances.filter(b => b.owner === walletAddress);

            // 🔥 FIX: CALCOLO DEI SOL VESTITI DA wSOL (Quando usano i bot di trading)
            let solSpent = 0;
            
            // 1. Guarda se il conto base SOL si è abbassato
            const walletAccIndex = tx.transaction.message.accountKeys.findIndex(k => k.pubkey.toString() === walletAddress);
            if (walletAccIndex !== -1 && tx.meta.preBalances && tx.meta.postBalances) {
                const preSol = tx.meta.preBalances[walletAccIndex] / 1e9;
                const postSol = tx.meta.postBalances[walletAccIndex] / 1e9;
                if (preSol > postSol) {
                    let diff = preSol - postSol;
                    if (diff > 0.005) solSpent += diff; // Ignoriamo se è solo la gas fee
                }
            }
            
            // 2. Guarda se hanno usato Wrapped SOL (wSOL)
            const wSolPre = preBals.find(b => b.mint === "So11111111111111111111111111111111111111112");
            const wSolPost = postBals.find(b => b.mint === "So11111111111111111111111111111111111111112");
            if (wSolPre && wSolPost) {
                const diffToken = (wSolPre.uiTokenAmount.uiAmount || 0) - (wSolPost.uiTokenAmount.uiAmount || 0);
                if (diffToken > 0) solSpent += diffToken;
            }

            let actionType = null;
            let targetMint = null;

            for (let post of postBals) {
                const mint = post.mint;
                if (mint === "So11111111111111111111111111111111111111112") continue; 

                const pre = preBals.find(b => b.mint === mint);
                const preAmount = pre ? (pre.uiTokenAmount.uiAmount || 0) : 0;
                const postAmount = post.uiTokenAmount.uiAmount || 0;

                if (postAmount > preAmount) {
                    actionType = "BUY";
                    targetMint = mint;
                    if (solSpent > 0.02) historicalBuysSol.push(solSpent); 
                } else if (postAmount < preAmount) {
                    actionType = "SELL";
                    targetMint = mint;
                }
            }

            if (actionType) {
                actions.push({ type: actionType, mint: targetMint, signature: sigInfo.signature, solSpent: solSpent });
            }
        }
        
        let avgBet = historicalBuysSol.length > 0 ? (historicalBuysSol.reduce((a, b) => a + b, 0) / historicalBuysSol.length) : 0;
        
        actions = actions.map(act => {
            if (act.type === "BUY") {
                let conviction = "NORMALE ⚖️";
                let reason = `Investe ${act.solSpent.toFixed(2)} SOL.`;
                let color = "#ffaa00"; 
                
                if (historicalBuysSol.length >= 2) {
                    if (act.solSpent > avgBet * 1.5) {
                        conviction = "ALTA CONVINZIONE 🦍";
                        reason = `Puntata Massiccia: ${act.solSpent.toFixed(2)} SOL (Media: ${avgBet.toFixed(2)}).`;
                        color = "#00e676";
                    } else if (act.solSpent > 0 && act.solSpent < avgBet * 0.5) {
                        conviction = "TEST / ALTO RISCHIO 🧪";
                        reason = `Puntata Bassa: ${act.solSpent.toFixed(2)} SOL (Media: ${avgBet.toFixed(2)}).`;
                        color = "#ff4d4d";
                    }
                }
                act.strategy = { conviction, reason, color, solSpent: act.solSpent, avgBet };
            }
            return act;
        });

        res.json({ actions: actions.slice(0, 3) });
    } catch (error) {
        res.json({ actions: [], error: error.message });
    }
});

// Avvia il server
app.listen(PORT, () => { console.log(`🚀 Server Radar avviato e in ascolto sulla porta ${PORT}`); });