require('dotenv').config(); // 🔥 FONDAMENTALE: Legge la tua chiave API dal file .env
const express = require('express');
const cors = require('cors');
const { Connection, PublicKey } = require('@solana/web3.js');


const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const solanaConnection = new Connection(RPC_URL, 'confirmed');

const app = express();
const PORT = 3000; 

app.use(express.json({ limit: '50mb' }));
app.use(cors());
// 🔥 RAM CACHE: Memoria a breve termine per abbattere il carico su Helius
const scanCache = new Map();
const CACHE_TTL_MS = 15000; // 15 secondi di validità dei dati
// 🔥 FIX ANTI-BAN HELIUS: Forza ogni pausa ad essere almeno di 600ms
const delay = (ms) => new Promise(resolve => setTimeout(resolve, Math.max(ms, 600)));

// =====================================================================
// 1. ANALISI DEL BUNDLE INIZIALE E BOT
// =====================================================================
async function analizzaBotEarlyLaunch(mintPubKey) {
    try {
        const signatures = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 20 });
        if (signatures.length === 0) return { potenzialeVolumeBot: "BASSO", bundleSlot0: false, supplyBundledPct: 0, funderComune: null, indicatoreTesto: "Nessun dato." };

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
            const largestAccs = await solanaConnection.getTokenLargestAccounts(mintPubKey);
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
            indicatore = `🚀 BOT PUMP PRONTO: ${sameBlockTxCount} buy nello stesso blocco.`;
        } else if (punteggioBot >= 40) {
            livelloVolume = "MODERATO";
            indicatore = `🟡 BOT MODERATI: Rilevati acquisti raggruppati.`;
        }

        return { potenzialeVolumeBot: livelloVolume, bundleSlot0: sameBlockTxCount >= 3, supplyBundledPct: supplyBundledPct, funderComune: masterWallet, indicatoreTesto: indicatore };
    } catch (error) {
        return { potenzialeVolumeBot: "NON DISPONIBILE", bundleSlot0: false, supplyBundledPct: 0, funderComune: null, indicatoreTesto: "Errore blocco 0." };
    }
}

// =====================================================================
// 2. SIMULATORE AVANZATO (Con Graduation Alert)
// =====================================================================
function calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk, bundleSupplyPct, tokenAgeMinutes, txMinuto) {
    if (!currentFdv || currentFdv <= 0) {
        return {
            testo: "📈 Simulazione: ⏳ ATTESA DATI LIVE API.",
            tradeValido: true,
            simulatoreTesto: "⚠️ Attendi 5 secondi. Analisi in corso su curva iniziale.",
            azione: "ATTESA DATI", coloreAzione: "#ffaa00", moltiplicatore: 1.5, targetMC: 7500,
            raccomandazioneFees: { slippage: "3%", fee: "0.0005 SOL", text: "Standard" }
        };
    }

    const mcAttuale = currentFdv;
    let risultato = { testo: "", tradeValido: true, simulatoreTesto: "", moltiplicatore: 0, targetMC: 0, azione: "", coloreAzione: "", ctoStatus: "Basso" };
    let nostraUscita = 0;

    // 🔥 ORACOLO FEES: Calcolo dinamico in base alla congestione
    if (txMinuto > 45) {
        risultato.raccomandazioneFees = { slippage: "15%", fee: "0.005 SOL", text: "🔥 MASSIMA (Rischio Fallimento Tx)" };
    } else if (txMinuto > 15) {
        risultato.raccomandazioneFees = { slippage: "5%", fee: "0.002 SOL", text: "⚡ ALTA CONGESTIONE" };
    } else {
        risultato.raccomandazioneFees = { slippage: "1%", fee: "0.0001 SOL", text: "🟢 RETE FLUIDA" };
    }

    // 🔥 GRADUATION ALERT: Zona critica pre-Raydium (45k - 69k)
    if (mcAttuale >= 45000 && mcAttuale <= 69000) {
        if (bundleSupplyPct >= 10 || clusterRisk > 0 || isFakeDev) {
            risultato.azione = "🚨 DUMP PRE-RAYDIUM"; risultato.coloreAzione = "#ff4d4d"; risultato.tradeValido = false;
            risultato.testo = `📈 Simulazione: ☠️ ZONA GRADUATION CRITICA. I bot detengono il ${bundleSupplyPct}%. Dumperanno tutto a $60k per non perdere il controllo su Raydium.`;
            risultato.simulatoreTesto = `⛔ NON ENTRARE: Dump matematico imminente prima della migrazione.`;
            return risultato;
        } else {
            nostraUscita = 69000; // Il target è esattamente la migrazione
            risultato.azione = "🟢 PUSH TO RAYDIUM"; risultato.coloreAzione = "#00e676";
            risultato.testo = `📈 Simulazione: 🚀 GRADUATION PULITA. Pressione d'acquisto organica. Target migrazione a $69k.`;
        }
    } 
    // FASE RAYDIUM (Post-Graduation)
    else if (mcAttuale > 69000) {
        if (bundleSupplyPct >= 10 || clusterRisk > 0) {
            nostraUscita = Math.floor(mcAttuale * 1.20); 
            risultato.azione = "RIDE THE WAVE (Cabala)"; risultato.coloreAzione = "#ff007f";
            risultato.testo = `📈 Simulazione: 🦍 CABALA IN TRENDING SU RAYDIUM. Mordi e fuggi. Target: $${nostraUscita.toLocaleString()} MC.`;
        } else {
            nostraUscita = Math.floor(mcAttuale * 1.30); 
            risultato.azione = "TREND ORGANICO PULITO"; risultato.coloreAzione = "#00ffcc";
            risultato.testo = `📈 Simulazione: ✅ ORGANICO LEGITTIMO POST-RAYDIUM. Target Trailing: $${nostraUscita.toLocaleString()} MC.`;
        }
    }
    // FASE INIZIALE (0 - 45k)
    else {
        if (bundleSupplyPct >= 20) {
            risultato.azione = "DUMP NUCLEARE IN CORSO"; risultato.coloreAzione = "#ff4d4d"; risultato.tradeValido = false;
            risultato.testo = `📈 Simulazione: 🚨 BUNDLE MORTALE (${bundleSupplyPct}%). Azzeramento imminente.`;
            risultato.simulatoreTesto = `⛔ OPERAZIONE BLOCCATA: I bot ti prosciugheranno.`;
            return risultato; 
        } else if (clusterRisk > 0 || isFakeDev) {
            let maxTarget = mcAttuale > 25000 ? mcAttuale * 1.15 : 25000; 
            nostraUscita = Math.floor(Math.min(mcAttuale * 1.25, maxTarget)); 
            risultato.azione = "FASE PUMP BOT (Scalp)"; risultato.coloreAzione = "#ffaa00";
            risultato.testo = `📈 Simulazione: ⚠️ TRAPPOLA IN FORMAZIONE. 🟢 MICRO-SCALPING. Esci a: $${nostraUscita.toLocaleString()} MC.`;
        } else {
            nostraUscita = Math.floor(mcAttuale * 1.35); 
            risultato.azione = "EARLY GEM (Basso Rischio)"; risultato.coloreAzione = "#00e676";
            risultato.testo = `📈 Simulazione: 💎 PARTENZA PULITA. Target Trailing: $${nostraUscita.toLocaleString()} MC.`;
        }
    }

    risultato.targetMC = nostraUscita;
    risultato.moltiplicatore = nostraUscita > 0 ? (nostraUscita / mcAttuale) : 0;
    
    if (risultato.tradeValido) {
        const ritornoSol = risultato.moltiplicatore.toFixed(2);
        const nettoSol = (ritornoSol - 1).toFixed(2);
        risultato.simulatoreTesto = `Entri a ${(mcAttuale/1000).toFixed(1)}k ➔ Esci a ${(nostraUscita/1000).toFixed(1)}k ➔ Incassi x${ritornoSol} (+${(nettoSol*100).toFixed(0)}% Netto)`;
    }
    return risultato;
}

// =====================================================================
// 2. TACTICAL ADVICE (Gestito da Gemini 1.5 Flash)
// =====================================================================
// =====================================================================
// =====================================================================
// 2. TACTICAL ADVICE (Bypass Diretto REST API Gemini 1.5 Flash su v1beta)
// =====================================================================
async function generateTacticalAdviceAI(devWalletAgeHours, ubiData, bundledSupply, isFakeDev, sybilData, fedinaDev) {
    const ubiPct = (ubiData && ubiData.totalTx > 0) ? ((ubiData.uniqueBuyers / ubiData.totalTx) * 100).toFixed(1) : 0;
    const sybilStr = sybilData ? JSON.stringify(sybilData) : "Nessun dato";
    const fedinaStr = fedinaDev ? JSON.stringify(fedinaDev) : "Nessun dato";

    const prompt = `
Sei il "Giudice", un'intelligenza artificiale addestrata per analizzare il rischio dei memecoin su Solana in tempo reale.
Devi analizzare i seguenti dati on-chain estratti al blocco 0 e determinare il livello di rischio di un "Rug Pull" o di "Exit Liquidity".

DATI ON-CHAIN:
- Età Wallet Creatore: ${devWalletAgeHours.toFixed(1)} ore (Fake Dev: ${isFakeDev})
- Storico Dev (Fedina Penale): ${fedinaStr}
- Volume UBI (Unique Buyers): ${ubiPct}% (Unici: ${ubiData ? ubiData.uniqueBuyers : 0}, Totali: ${ubiData ? ubiData.totalTx : 0})
- Supply in mano ai Bot/Bundle: ${bundledSupply}%
- Rete Sybil (Finanziamenti incrociati): ${sybilStr}

REGOLE DI OUTPUT:
Non aggiungere testo discorsivo. Restituisci ESCLUSIVAMENTE un oggetto JSON valido con le seguenti 6 chiavi esatte, usando emoji e formattazione sintetica stile terminale:
1. "devStatus": Analisi del portafoglio sviluppatore (es. 🚨 SERIAL RUGGER... oppure ✅ DEV STORICO...)
2. "volumeStatus": Analisi dell'organicità del volume (es. 💀 WASH TRADING... oppure ⚡ VOLUME ORGANICO...)
3. "topHoldersStatus": Analisi di chi detiene la supply (es. ⚠️ BUNDLE RILEVATO... oppure 🛡️ SUPPLY DISTRIBUITA...)
4. "sybilStatus": Analisi della rete di finanziamento (es. 🕸️ RETE SYBIL... oppure ✅ ACQUIRENTI INDIPENDENTI...)
5. "estimatedRugTime": Tempo stimato prima della truffa (es. ⏱️ 1-5 MINUTI... oppure ⏳ INDEFINITO...)
6. "strategy": La tua direttiva finale per il trader (es. ⛔ TRADE BLOCCATO... oppure 🟢 RIDE THE WAVE...)
`;

    try {
        // Pulizia sicura della chiave
        const rawKey = process.env.GEMINI_API_KEY || "";
        const apiKey = rawKey.replace(/['"\s]/g, '');
        
        // 🔥 ENDPOINT V1BETA (Indispensabile per i modelli 1.5 sui nuovi progetti)
        // 🔥 ENDPOINT V1BETA AGGIORNATO (Usiamo il velocissimo gemini-3.5-flash)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("Errore Interno Google API:", JSON.stringify(data, null, 2));
            throw new Error(`L'API ha restituito errore: ${data.error?.status || 'Sconosciuto'}`);
        }

        const text = data.candidates[0].content.parts[0].text;
        const cleanJson = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
        return JSON.parse(cleanJson);
        
    } catch (error) {
        console.error("Errore Fetch Gemini:", error.message);
        return {
            devStatus: "⚠️ ERRORE AI: Dati Dev non analizzati",
            volumeStatus: "⚠️ ERRORE AI: Volume non analizzato",
            topHoldersStatus: "⚠️ ERRORE AI: Supply non analizzata",
            sybilStatus: "⚠️ ERRORE AI: Sybil non analizzato",
            estimatedRugTime: "⏱️ SCONOSCIUTO",
            strategy: "⛔ ATTENZIONE: Motore AI disconnesso. Non operare alla cieca."
        };
    }
}

// =====================================================================
// 3. ANALISI COMPONENTI
// =====================================================================
async function calcolaEtaWallet(walletAddress) {
    try {
        const signatures = await solanaConnection.getSignaturesForAddress(new PublicKey(walletAddress), { limit: 1000 });
        if (signatures.length === 0) return 0; 
        const oldestTx = signatures[signatures.length - 1];
        if (oldestTx.blockTime) return (Date.now() - (oldestTx.blockTime * 1000)) / (1000 * 60 * 60 * 24);
        return null;
    } catch (e) { return null; }
}

async function analizzaUBI(signatures) {
    try {
        const recentSigs = signatures.slice(0, 30).map(s => s.signature);
        if (recentSigs.length === 0) return { uniqueBuyers: 0, totalTx: 0 };
        await delay(250); 
        const txs = await solanaConnection.getParsedTransactions(recentSigs, { maxSupportedTransactionVersion: 0 });
        let uniqueWallets = new Set();
        let validTxCount = 0;
        txs.forEach(tx => {
            if (tx && tx.transaction && tx.transaction.message.accountKeys) {
                const feePayer = tx.transaction.message.accountKeys[0].pubkey.toString();
                uniqueWallets.add(feePayer);
                validTxCount++;
            }
        });
        return { uniqueBuyers: uniqueWallets.size, totalTx: validTxCount };
    } catch (error) { return { uniqueBuyers: 1, totalTx: 1 }; }
}

async function analizzaBattitoCardiaco(mintPubKey) {
    try {
        const signatures = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 50 });
        if (signatures.length === 0) return { stato: "MORTO", txMinuto: 0, colore: "#ff4d4d", blocco: true, secondiDaUltimaTx: 999 };

        const nowSec = Math.floor(Date.now() / 1000);
        let txInLast60s = 0;
        let lastTxTime = signatures[0].blockTime || nowSec; 
        let secondiDaUltimaTx = nowSec - lastTxTime;

        signatures.forEach(sig => {
            if (sig.blockTime && (nowSec - sig.blockTime <= 60)) txInLast60s++;
        });

        let stato = "", colore = "", blocco = false;
        if (secondiDaUltimaTx > 30 || txInLast60s < 5) {
            stato = "☠️ ZERO LIQUIDITÀ (Trappola)"; colore = "#ff4d4d"; blocco = true;
        } else if (txInLast60s < 15) {
            stato = "⚠️ MORENTE (Bassi scambi)"; colore = "#ffaa00"; blocco = false;
        } else if (txInLast60s < 40) {
            stato = "🟢 SANO (Buon ritmo)"; colore = "#00e676"; blocco = false;
        } else {
            stato = "🔥 IPER-ATTIVO (FOMO)"; colore = "#00aaff"; blocco = false;
        }

        return { stato, txMinuto: txInLast60s, colore, blocco, secondiDaUltimaTx: secondiDaUltimaTx > 0 ? secondiDaUltimaTx : 0 };
    } catch (error) { return { stato: "ERRORE LETTURA", txMinuto: 0, colore: "#ff4d4d", blocco: true, secondiDaUltimaTx: 999 }; }
}

async function analizzaCabalaSupply(mintPubKey) {
    try {
        const largestAccs = await solanaConnection.getTokenLargestAccounts(mintPubKey);
        if (!largestAccs.value || largestAccs.value.length === 0) return null;

        const topAccounts = largestAccs.value.slice(0, 10);
        let cabalaMap = {}; let sybilCount = 0; let risultati = [];

        for (let acc of topAccounts) {
            if (acc.uiAmount < 5000000) continue; 
            const pct = (acc.uiAmount / 1000000000) * 100;
            try {
                await delay(200); 
                const accountInfo = await solanaConnection.getParsedAccountInfo(new PublicKey(acc.address));
                if (!accountInfo.value || !accountInfo.value.data.parsed) continue;
                const ownerWallet = accountInfo.value.data.parsed.info.owner;
                
                await delay(200); 
                const sigs = await solanaConnection.getSignaturesForAddress(new PublicKey(ownerWallet), { limit: 50 });
                if(sigs.length === 0) continue;
                if (sigs.length < 5) sybilCount++;
                
                const oldestTx = sigs[sigs.length - 1]; 
                await delay(200); 
                const txDetails = await solanaConnection.getParsedTransaction(oldestTx.signature, { maxSupportedTransactionVersion: 0 });
                
                let funder = "Sconosciuto";
                if (txDetails && txDetails.transaction.message.accountKeys.length > 1) {
                    funder = txDetails.transaction.message.accountKeys[0].pubkey.toString();
                    if (funder === ownerWallet || txDetails.transaction.message.accountKeys.length > 10) funder = "Exchange/Auto-finanziato";
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

        let maxPct = 0; let worstCabal = null;
        for (const [funder, data] of Object.entries(cabalaMap)) {
            if (data.count >= 2 && data.pct > maxPct) { 
                maxPct = data.pct;
                worstCabal = { funder, pct: data.pct, count: data.count };
            }
        }

        if (sybilCount >= 3) return { pericolo: true, scoreAggiuntivo: 50, testo: `🚨 ATTACCO SYBIL: ${sybilCount} Top Holders sono portafogli fantasma.` };
        if (worstCabal && worstCabal.pct >= 15) return { pericolo: true, scoreAggiuntivo: 40, testo: `🚨 SCUDO SUPPLY: ${worstCabal.count} Top Holders (${worstCabal.pct.toFixed(1)}%) manovrati dallo stesso Dev.` };
        return { pericolo: false, scoreAggiuntivo: 0, testo: `✅ SCUDO SUPPLY: Nessun attacco Sybil o Cabala.` };
    } catch (error) { return null; }
}

async function analizzaMicroDumping(mintPubKey) {
    try {
        const largestAccs = await solanaConnection.getTokenLargestAccounts(mintPubKey);
        if (!largestAccs.value || largestAccs.value.length < 2) return null;

        const topHolders = largestAccs.value.slice(1, 4); 
        let sanguisugheTrovate = 0; let totaleVenditeSanguisughe = 0;

        for (let acc of topHolders) {
            if (acc.uiAmount < 10000000) continue;
            try {
                await delay(200);
                const sigs = await solanaConnection.getSignaturesForAddress(new PublicKey(acc.address), { limit: 10 });
                if (sigs.length < 3) continue; 

                await delay(200);
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

                if (vendite >= 3) { sanguisugheTrovate++; totaleVenditeSanguisughe += vendite; }
            } catch (e) { continue; }
        }

        if (sanguisugheTrovate > 0) return { pericolo: true, scoreAggiuntivo: 35, testo: `🩸 SCUDO SANGUISUGA: Rilevato Micro-Dumping (${totaleVenditeSanguisughe} vendite).` };
        return { pericolo: false, scoreAggiuntivo: 0, testo: `✅ SCUDO SANGUISUGA: I Top Holders holdano pulito.` };
    } catch (error) { return null; }
}

async function analizzaGrafoSybil(mintPubKey) {
    try {
        const largestAccs = await solanaConnection.getTokenLargestAccounts(mintPubKey);
        if (!largestAccs.value || largestAccs.value.length < 2) return null;

        const topHolders = largestAccs.value.slice(1, 21);
        let funderMap = {}; let areSelling = false;

        for (let acc of topHolders) {
            if (acc.uiAmount < 1000000) continue; 
            const pct = (acc.uiAmount / 1000000000) * 100;
            try {
                await delay(150);
                const accInfo = await solanaConnection.getParsedAccountInfo(new PublicKey(acc.address));
                if (!accInfo.value) continue;
                const owner = accInfo.value.data.parsed.info.owner;

                await delay(150);
                const sigs = await solanaConnection.getSignaturesForAddress(new PublicKey(owner), { limit: 15 });
                if (sigs.length === 0 || sigs.length >= 15) continue; 

                const oldestTx = sigs[sigs.length - 1];
                await delay(150);
                const txDetails = await solanaConnection.getParsedTransaction(oldestTx.signature, { maxSupportedTransactionVersion: 0 });
                
                let funder = "Sconosciuto";
                if (txDetails && txDetails.transaction.message.accountKeys.length > 1) {
                    funder = txDetails.transaction.message.accountKeys[0].pubkey.toString();
                    if (funder === owner || txDetails.transaction.message.accountKeys.length > 5) funder = "CEX_Mixer";
                }

                if (funder !== "Sconosciuto" && funder !== "CEX_Mixer") {
                    if (!funderMap[funder]) funderMap[funder] = { count: 0, pct: 0 };
                    funderMap[funder].count++; funderMap[funder].pct += pct;
                }
                if (sigs.length > 4) areSelling = true;
            } catch (e) { continue; }
        }

        let maxSybilNode = null;
        for (const [funder, data] of Object.entries(funderMap)) {
            if (data.count >= 3) {
                if (!maxSybilNode || data.count > maxSybilNode.count) maxSybilNode = { funder, ...data };
            }
        }

        if (maxSybilNode) return { rilevato: true, funderMadre: maxSybilNode.funder, numeroWallet: maxSybilNode.count, supplyControllata: maxSybilNode.pct, inVendita: areSelling, testo: `🌳 SYBIL TREE: ${maxSybilNode.count} Top Holders (${maxSybilNode.pct.toFixed(1)}%) finanziati dallo stesso wallet padre. ${areSelling ? 'Iniziano a vendere! 🩸' : 'Stanno holdando 💎'}` };
        return { rilevato: false, testo: "🌳 SYBIL TREE: I Top 20 Holders sembrano indipendenti." };
    } catch (error) { return null; }
}

async function analizzaFedinaPenaleDev(devWalletAddress, currentTokenMint) {
    try {
        const sigs = await solanaConnection.getSignaturesForAddress(new PublicKey(devWalletAddress), { limit: 60 });
        if (sigs.length < 5) return { tokensLanciati: 0, status: "PULITO (Wallet Nuovo)", punteggioRischio: 0 };

        let pumpFunInteractions = 0; let altriTokenTrovati = new Set();
        const recentSigs = sigs.slice(0, 15).map(s => s.signature);
        await delay(200);
        const txs = await solanaConnection.getParsedTransactions(recentSigs, { maxSupportedTransactionVersion: 0 });

        txs.forEach(tx => {
            if (!tx || !tx.transaction || !tx.transaction.message) return;
            const accounts = tx.transaction.message.accountKeys.map(k => k.pubkey.toString());
            if (accounts.includes("6EF8rrecthR5Dkzon8Nwu78hRvfX91R3KzXFzH9g5cWg")) {
                pumpFunInteractions++;
                if (tx.meta && tx.meta.postTokenBalances) {
                    tx.meta.postTokenBalances.forEach(b => {
                        if (b.mint !== "So11111111111111111111111111111111111111112" && b.mint !== currentTokenMint) altriTokenTrovati.add(b.mint);
                    });
                }
            }
        });

        const numTokenPassati = altriTokenTrovati.size;
        if (numTokenPassati === 0) return { tokensLanciati: 0, status: "PULITO (Primo Progetto)", punteggioRischio: 0 };
        else if (numTokenPassati >= 3) return { tokensLanciati: numTokenPassati, status: "🚨 SERIAL RUGGER", punteggioRischio: 60 };
        else return { tokensLanciati: numTokenPassati, status: "🔄 DEV RICORRENTE", punteggioRischio: 20 };
    } catch (error) { return { tokensLanciati: 0, status: "SCONOSCIUTO", punteggioRischio: 0 }; }
}

// =====================================================================
// 4. API SCAN
// =====================================================================
app.get('/api/scan/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;
    
    // 🧠 CONTROLLO CACHE: Se ho già analizzato questo token negli ultimi 15 secondi, restituisco il dato istantaneamente.
    if (scanCache.has(tokenMint)) {
        const cached = scanCache.get(tokenMint);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log(`⚡ CACHE HIT: Restituisco i dati di ${tokenMint} in 0ms`);
            return res.json(cached.data);
        }
    }

    try {
        
        // ... (IL RESTO DEL TUO CODICE RIMANE IDENTICO) ...
        console.log(`\n🔍 Scansione Avanzata ON-CHAIN per: ${tokenMint}`);
        const mintPubKey = new PublicKey(tokenMint);

        const velocityData = await analizzaBattitoCardiaco(mintPubKey);
        if (velocityData.blocco) {
            return res.json({
                score: 90, rischio: "ALTISSIMO / TRAPPOLA", dettagli: [`🛑 Battito Cardiaco MORTO`],
                graficoAttivo: false, vitaToken: "N/A", azione: "MORTO (Illiquido)", fugaColor: velocityData.colore,
                hud: { change: 0, volume: 0, trend: "N/A", color: "#444", icon: "💤" }, tradeValido: false,
                simulatoreTesto: `⛔ OPERAZIONE BLOCCATA: Zero compratori attivi. Liquidi persi.`, moltiplicatore: 0, targetMC: 0, prezzoSol: 150
            });
        }

        const earlyBotData = await analizzaBotEarlyLaunch(mintPubKey);
        await delay(200); 
        
        let currentFdv = 0; let pairCreatedAt = null; 
        try {
            const dexResp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
            const dexData = await dexResp.json();
            if (dexData.pairs && dexData.pairs.length > 0) {
                currentFdv = dexData.pairs[0].fdv || 0; pairCreatedAt = dexData.pairs[0].pairCreatedAt; 
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

        // 🚀 TURBO MODE: Lanciamo le analisi più pesanti tutte nello stesso istante
        // 🚀 SMART TURBO: Evitiamo il blocco di Helius dividendo in due ondate
        console.log("⚡ Avvio motori di analisi (Ondata 1)...");
        const [signatures, cabalaData] = await Promise.all([
            solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 100 }),
            analizzaCabalaSupply(mintPubKey)
        ]);

        await delay(800); // 🫁 Facciamo respirare il nodo RPC

        console.log("⚡ Avvio motori di analisi (Ondata 2)...");
        const [microDumpData, sybilData] = await Promise.all([
            analizzaMicroDumping(mintPubKey),
            analizzaGrafoSybil(mintPubKey)
        ]);
        let walletAgeDays = null;
        let walletAgeHours = 0;
        let isFakeDev = false;
        let logAnalisi = [];
        let devWallet = "Sconosciuto";
        let fedinaDev = null;

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
                devWallet = txDetails.transaction.message.accountKeys[0].pubkey.toString();
                
                fedinaDev = await analizzaFedinaPenaleDev(devWallet, tokenMint);
                walletAgeDays = await calcolaEtaWallet(devWallet);
                if (walletAgeDays !== null) {
                    walletAgeHours = walletAgeDays * 24;
                    if (walletAgeDays < 1) {
                        isFakeDev = true;
                        logAnalisi.push("🛑 FAKE DEV: Wallet creato da meno di 24 ore!");
                    }
                }
            }
        }

        const ubiData = await analizzaUBI(signatures);
        
        // 🔥 L'Intelligenza Artificiale analizza il quadro generale
        const tacticalAdvice = await generateTacticalAdviceAI(walletAgeHours, ubiData, earlyBotData.supplyBundledPct, isFakeDev, sybilData, fedinaDev);

        logAnalisi.push(earlyBotData.indicatoreTesto);
        logAnalisi.push(`✅ Battito Cardiaco: ${velocityData.txMinuto} tx/min (Ultima tx: ${velocityData.secondiDaUltimaTx}s fa) - ${velocityData.stato}`);
        if (cabalaData && cabalaData.testo) logAnalisi.push(cabalaData.testo);
        if (microDumpData && microDumpData.testo) logAnalisi.push(microDumpData.testo);
        if (sybilData && sybilData.testo) logAnalisi.push(sybilData.testo);

        const clusterRisk = earlyBotData.bundleSlot0 ? 80 : 0;
        let simulazione = calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk, earlyBotData.supplyBundledPct, tokenAgeMinutes, velocityData.txMinuto);

        if (cabalaData && cabalaData.pericolo) simulazione.tradeValido = false; 
        if (microDumpData && microDumpData.pericolo) {
            simulazione.tradeValido = false;
            simulazione.azione = "MICRO-DUMPING IN CORSO";
            simulazione.coloreAzione = "#ff4d4d";
            simulazione.testo = `📈 Simulazione: ☠️ TRAPPOLA LENTA. I Top Holders stanno svuotando la liquidità. Fuggire.`;
            simulazione.simulatoreTesto = `⛔ OPERAZIONE BLOCCATA: Rischio prosciugamento capitale.`;
        }

        logAnalisi.push(simulazione.testo);

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
        if (fedinaDev) finalScore = Math.min(100, finalScore + fedinaDev.punteggioRischio);

        let rischioStatus = finalScore >= 80 ? "ALTISSIMO / TRAPPOLA" : (finalScore >= 60 ? "ALTO / MANIPOLATO" : "MODERATO");

        // 1. Assegniamo l'oggetto alla variabile risultatoFinale
        const risultatoFinale = {
            score: finalScore,
            rischio: rischioStatus,
            dettagli: logAnalisi,
            graficoAttivo: false,
            datiGrafico: null,
            devWallet: devWallet,
            advice: tacticalAdvice,
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
            prezzoSol: parseFloat(solPriceUsd),
            // 🔥 NUOVO: Passiamo all'estensione i settaggi per il Bot di trading
            tradingFees: simulazione.raccomandazioneFees 
        };

        // 2. 🔥 SALVATAGGIO IN CACHE: Salviamo il risultato per 15 secondi
        scanCache.set(tokenMint, { timestamp: Date.now(), data: risultatoFinale });

        // 3. Invia la risposta
        res.json(risultatoFinale);
    } catch (error) { 
        console.error("Errore Dettagliato API Scan:", error);
        res.status(500).json({ error: "Errore API" }); 
    }
});

// =====================================================================
// 5. LIVE SPY RADAR
// =====================================================================
app.get('/api/spy-wallet/:walletAddress', async (req, res) => {
    try {
        const walletAddress = req.params.walletAddress;
        const pubKey = new PublicKey(walletAddress);
        
        const sigs = await solanaConnection.getSignaturesForAddress(pubKey, { limit: 15 });
        if (sigs.length === 0) return res.json({ actions: [] });

        let classificazione = "Trader Umano 🧑‍💻";
        let timeDiffs = [];
        for (let i = 0; i < sigs.length - 1; i++) {
            if (sigs[i].blockTime && sigs[i+1].blockTime) {
                timeDiffs.push(Math.abs(sigs[i].blockTime - sigs[i+1].blockTime));
            }
        }
        
        if (timeDiffs.length > 0) {
            const avgTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
            if (avgTime < 3) classificazione = "Sniper Bot 🤖";
            else if (avgTime < 15) classificazione = "Algo Trader ⚡";
        }

        const sigStrings = sigs.slice(0, 10).map(s => s.signature);
        const txs = await solanaConnection.getParsedTransactions(sigStrings, { maxSupportedTransactionVersion: 0 });

        let actions = [];
        let historicalBuysSol = [];

        for (let i = 0; i < txs.length; i++) {
            const tx = txs[i];
            const sigInfo = sigs[i]; 
            if (!tx || !tx.meta || !tx.meta.postTokenBalances) continue;

            const preBals = tx.meta.preTokenBalances.filter(b => b.owner === walletAddress);
            const postBals = tx.meta.postTokenBalances.filter(b => b.owner === walletAddress);

            let solSpent = 0;
            const walletAccIndex = tx.transaction.message.accountKeys.findIndex(k => k.pubkey.toString() === walletAddress);
            if (walletAccIndex !== -1 && tx.meta.preBalances && tx.meta.postBalances) {
                const preSol = tx.meta.preBalances[walletAccIndex] / 1e9;
                const postSol = tx.meta.postBalances[walletAccIndex] / 1e9;
                if (preSol > postSol) {
                    let diff = preSol - postSol;
                    if (diff > 0.005) solSpent += diff; 
                }
            }
            
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
                    actionType = "BUY"; targetMint = mint;
                    if (solSpent > 0.02) historicalBuysSol.push(solSpent); 
                } else if (postAmount < preAmount) {
                    actionType = "SELL"; targetMint = mint;
                }
            }

            if (actionType) {
                actions.push({ type: actionType, mint: targetMint, signature: sigInfo.signature, solSpent: solSpent });
            }
        }
        
        let avgBet = historicalBuysSol.length > 0 ? (historicalBuysSol.reduce((a, b) => a + b, 0) / historicalBuysSol.length) : 0;
        
        actions = actions.map(act => {
            if (act.type === "BUY") {
                let conviction = "NORMALE ⚖️"; let reason = `Size investita: ${act.solSpent.toFixed(2)} SOL.`; let color = "#ffaa00"; 
                if (historicalBuysSol.length >= 2) {
                    if (act.solSpent > avgBet * 1.5) {
                        conviction = "ALTA CONVINZIONE 🦍"; reason = `Heavy Buy: ${act.solSpent.toFixed(2)} SOL (Media era ${avgBet.toFixed(2)}).`; color = "#00e676";
                    } else if (act.solSpent > 0 && act.solSpent < avgBet * 0.5) {
                        conviction = "TEST / RISCHIO 🧪"; reason = `Micro-buy: ${act.solSpent.toFixed(2)} SOL (Media era ${avgBet.toFixed(2)}).`; color = "#ff4d4d";
                    }
                }
                act.strategy = { conviction, reason, color, solSpent: act.solSpent, avgBet };
            }
            return act;
        });

        res.json({ walletStats: { classificazione: classificazione }, actions: actions.slice(0, 3) });
    } catch (error) { res.json({ actions: [], error: error.message }); }
});

app.listen(PORT, () => { console.log(`🚀 Server Radar avviato e in ascolto sulla porta ${PORT}`); });