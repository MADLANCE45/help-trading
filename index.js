require('dotenv').config(); // 🔥 FONDAMENTALE: Legge la tua chiave API dal file .env
const express = require('express');
const cors = require('cors');
const { Connection, PublicKey } = require('@solana/web3.js');
const http = require('http');
const { Server } = require("socket.io");
// 1. Configurazione Ibrida: REST per le query storiche, WSS per il live stream
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const WSS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const blackBoxEventi = new Map();
const solanaConnection = new Connection(RPC_URL, {
    wsEndpoint: WSS_URL,
    commitment: 'confirmed'
});

// Variabile globale per tenere traccia della connessione aperta
let activeSubscriptionId = null;
const knownBotsCache = new Set();

// =====================================================================
// 📡 MOTORE LIVE STREAMING (Tape Reading & Order Flow)
// =====================================================================
function avviaAscoltoLive(tokenMint) {
    const mintPubKey = new PublicKey(tokenMint);

    if (activeSubscriptionId !== null) {
        solanaConnection.removeOnLogsListener(activeSubscriptionId);
        console.log("🔌 Canale precedente chiuso.");
    }

    console.log(`\n📡 Apertura canale WebSocket per: ${tokenMint}`);

    activeSubscriptionId = solanaConnection.onLogs(
        mintPubKey,
        async (logsInfo, context) => {
            if (logsInfo.err) return; 

            const signature = logsInfo.signature;

            try {
                // 1. Diamo al nodo 1 secondo per indicizzare la transazione prima di scaricarla
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 2. Scarichiamo la transazione completa
                const tx = await solanaConnection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
                if (!tx || !tx.meta || tx.meta.err) return;

                // 3. Estrazione dati: chi ha firmato e quanti SOL sono entrati/usciti
                const feePayer = tx.transaction.message.accountKeys[0].pubkey.toString();
                const preSol = (tx.meta.preBalances[0] || 0) / 1e9;
                const postSol = (tx.meta.postBalances[0] || 0) / 1e9;
                const deltaSol = Math.abs(preSol - postSol);

                // Filtriamo il rumore di fondo: ignoriamo le tx minuscole (sotto 0.05 SOL)
                // Questo evita di intasare l'estensione con bot da millesimi di dollaro
                if (deltaSol < 0.05) return;

                const tipoAzione = preSol > postSol ? "🟢 BUY" : "🔴 SELL";
                
                // 🔥 FILTRO ZOO (Classificazione Istantanea in RAM)
                let iconaZoo = "🐒";
                let tagZoo = "Scimmia";

                if (deltaSol > 15) {
                    iconaZoo = "🐋";
                    tagZoo = "Balena";
                } else if (deltaSol >= 3) {
                    iconaZoo = "🐬";
                    tagZoo = "Delfino";
                }

                // Se il wallet è nella nostra cache dei cecchini, lo marchiamo
                if (knownBotsCache.has(feePayer)) {
                    iconaZoo = "🤖";
                    tagZoo = "Robot Snipe";
                }

                const solscanLink = `https://solscan.io/tx/${signature}`;
                
                // 4. Creiamo il Pacchetto Quantitativo
                const liveEvent = {
                    tipo: tipoAzione,
                    sol: deltaSol.toFixed(2),
                    wallet: feePayer,
                    firma: signature,
                    timestamp: Date.now(),
                    zooIcon: iconaZoo,
                    zooTag: tagZoo,
                    solscan: solscanLink
                };

                console.log(`⚡ TAPE: ${liveEvent.tipo} | ${liveEvent.zooIcon} [${liveEvent.zooTag}] ${liveEvent.sol} SOL | Wallet: ${liveEvent.wallet.substring(0,6)}...`);
                // 🔥 SALVATAGGIO EVENTI TATTICI NELLA BLACK BOX
                if (!blackBoxEventi.has(tokenMint)) blackBoxEventi.set(tokenMint, []);
                const diarioEventi = blackBoxEventi.get(tokenMint);
                const ora = new Date().toLocaleTimeString('it-IT', { hour12: false });

                // ALGORITMO DI CLASSIFICAZIONE TATTICA
                // 1. Smart Money / Balene (Ora basta > 1.5 SOL per essere rilevante)
                if (deltaSol >= 1.5) {
                    diarioEventi.push(`[${ora}] 🌊 SMART MONEY: ${tagZoo} -> ${tipoAzione} di ${deltaSol.toFixed(2)} SOL.`);
                }
                // 2. Bot Snipe attivi
                else if (knownBotsCache.has(feePayer)) {
                    diarioEventi.push(`[${ora}] 🤖 BOT ACTION: Il cecchino ha fatto un ${tipoAzione} di ${deltaSol.toFixed(2)} SOL.`);
                }
                // 3. Rilevamento Micro-Dumping (Vendite medie tra 0.3 e 1.5 SOL)
                else if (tipoAzione === "🔴 SELL" && deltaSol >= 0.3) {
                    diarioEventi.push(`[${ora}] 🩸 DUMPING LENTO: Vendita di ${deltaSol.toFixed(2)} SOL da un wallet standard.`);
                }
                // 4. Pressione FOMO (Tanti piccoli acquisti)
                else if (tipoAzione === "🟢 BUY" && deltaSol >= 0.5) {
                    diarioEventi.push(`[${ora}] 🔥 FOMO RETAIL: Acquisto di ${deltaSol.toFixed(2)} SOL.`);
                }
                
                // Manteniamo gli ultimi 20 eventi per dare all'IA un contesto perfetto
                if (diarioEventi.length > 20) diarioEventi.shift();
                // 🚀 SPARA IL DATO LIVE ALL'ESTENSIONE!
                io.emit('nuovo_trade_live', liveEvent);

                // 🚀 QUI INSERIREMO SOCKET.IO PER INVIARE 'liveEvent' ALL'ESTENSIONE

            } catch (e) {
                // Ignoriamo i drop del nodo per non intasare i log in caso di congestione
            }
        },
        'confirmed'
    );
}

const app = express();
const PORT = 3000;

// 🔥 CREAZIONE SERVER HTTP E TUNNEL SOCKET.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permette all'estensione Firefox/Chrome di connettersi senza blocchi CORS
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("🔌 Un nuovo terminale (Estensione) si è connesso al Radar Live!");
});

app.use(express.json({ limit: '50mb' }));
app.use(cors());
// 🔥 RAM CACHE: Memoria a breve termine per abbattere il carico su Helius
// 🔥 RAM CACHE: Memoria a breve termine per abbattere il carico su Helius e Gemini
const scanCache = new Map();
const CACHE_TTL_MS = 60000; // 📉 Alzato a 60 secondi (salva le chiamate AI)
// 🔥 FIX ANTI-BAN HELIUS: Forza ogni pausa ad essere almeno di 600ms
// 🔥 FIX ANTI-BAN HELIUS: Forza ogni pausa ad essere almeno di 500ms
const delay = (ms) => new Promise(resolve => setTimeout(resolve, Math.max(ms, 500)));// =====================================================================
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
                const buyer = tx.transaction.message.accountKeys[0].pubkey.toString();
                const funder = tx.transaction.message.accountKeys[1].pubkey.toString();
                funderMap[funder] = (funderMap[funder] || 0) + 1;
                
                // 🔥 Se compra nelle prime 5 transazioni in assoluto, è un bot programmato
                if (i >= signatures.length - 5) {
                    knownBotsCache.add(buyer);
                }
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
// =====================================================================
// 2. SIMULATORE AVANZATO E SOGLIA DI DUMP (Dinamico)
// =====================================================================
function calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk, bundleSupplyPct, tokenAgeMinutes, txMinuto, orderFlowData) {
    if (!currentFdv || currentFdv <= 0) {
        return {
            testo: "📈 Simulazione: ⏳ ATTESA DATI LIVE API.",
            tradeValido: true, simulatoreTesto: "⚠️ Analisi in corso sulla curva iniziale.",
            azione: "ATTESA DATI", coloreAzione: "#ffaa00", moltiplicatore: 1.5, targetMC: 7500,
            raccomandazioneFees: { slippage: "3%", fee: "0.0005 SOL", text: "Standard" }
        };
    }

    const mcAttuale = currentFdv;
    let risultato = { testo: "", tradeValido: true, simulatoreTesto: "", moltiplicatore: 0, targetMC: 0, azione: "", coloreAzione: "", ctoStatus: "Basso" };
    let nostraUscita = 0;

    // 🔥 ORACOLO FEES DINAMICO BASATO SULLA VOLATILITÀ
    const volatilita = orderFlowData ? orderFlowData.volatilità : "NORMALE";
    if (txMinuto > 45 || volatilita === "ESTREMA") {
        risultato.raccomandazioneFees = { slippage: "20%", fee: "0.006 SOL", text: "🔥 GUERRA SUI BLOCCHI" };
    } else if (txMinuto > 15 || volatilita === "ALTA") {
        risultato.raccomandazioneFees = { slippage: "8%", fee: "0.002 SOL", text: "⚡ ALTA CONGESTIONE" };
    } else {
        risultato.raccomandazioneFees = { slippage: "2%", fee: "0.0001 SOL", text: "🟢 RETE FLUIDA" };
    }

    // 💣 CALCOLO SOGLIA DI LIQUIDAZIONE (INTENTO DEL BUNDLE)
    let sogliaDump = 0;
    if (bundleSupplyPct > 0) {
        // Se un bundle ha il 30%, inizierà a dumpare quando l'MC cresce in proporzione inversa al loro possesso
        sogliaDump = Math.floor(mcAttuale * (1 + (100 - bundleSupplyPct) / 50));
    }

    if (bundleSupplyPct >= 20) {
        risultato.azione = "DUMP PROGRAMMATO"; risultato.coloreAzione = "#ff4d4d"; risultato.tradeValido = false;
        risultato.testo = `📈 Simulazione: 🚨 BUNDLE PREDATORIO (${bundleSupplyPct}%). Il creatore aspetta liquidità. Soglia di scarico stimata a $${sogliaDump.toLocaleString()} MC.`;
        risultato.simulatoreTesto = `⛔ NON ENTRARE: Stanno aspettando che i retail iniettino SOL per scaricare.`;
    } 
    else if (mcAttuale >= 45000 && mcAttuale <= 69000) {
        if (clusterRisk > 0 || isFakeDev) {
            risultato.azione = "🚨 DUMP PRE-RAYDIUM"; risultato.coloreAzione = "#ff4d4d"; risultato.tradeValido = false;
            risultato.testo = `📈 Simulazione: ☠️ ZONA GRADUATION. I bot dumperanno prima dei $69k per evitare i lock di Raydium.`;
            risultato.simulatoreTesto = `⛔ PERICOLO: Dump matematico imminente prima della migrazione.`;
        } else {
            nostraUscita = 69000; 
            risultato.azione = "🟢 PUSH TO RAYDIUM"; risultato.coloreAzione = "#00e676";
            risultato.testo = `📈 Simulazione: 🚀 Volume organico (${orderFlowData ? orderFlowData.buyPressure : 50}% Buy). Target Raydium: $69k.`;
        }
    } 
    else {
        // Calcolo Target Dinamico basato sull'Order Flow
        const buyPressure = orderFlowData ? parseFloat(orderFlowData.buyPressure) : 50;
        const spintaAggiuntiva = buyPressure > 60 ? 1.40 : 1.15; // Se c'è molta pressione in acquisto, il target si alza
        
        nostraUscita = Math.floor(mcAttuale * spintaAggiuntiva);
        // Se c'è un bundle, assicuriamoci di uscire prima della sua soglia di dump
        if (sogliaDump > 0 && nostraUscita > sogliaDump) nostraUscita = Math.floor(sogliaDump * 0.85);

        risultato.azione = buyPressure > 60 ? "TREND RIALZISTA" : "SCALP RAPIDO"; 
        risultato.coloreAzione = buyPressure > 60 ? "#00ffcc" : "#ffaa00";
        risultato.testo = `📈 Simulazione: Buy Pressure al ${buyPressure}%. Obiettivo dinamico pre-dump: $${nostraUscita.toLocaleString()} MC.`;
    }

    risultato.targetMC = nostraUscita;
    risultato.moltiplicatore = nostraUscita > 0 ? (nostraUscita / mcAttuale) : 0;
    
    if (risultato.tradeValido) {
        const ritornoSol = risultato.moltiplicatore.toFixed(2);
        const nettoSol = (ritornoSol - 1).toFixed(2);
        risultato.simulatoreTesto = `Entri a ${(mcAttuale/1000).toFixed(1)}k ➔ Esci a ${(nostraUscita/1000).toFixed(1)}k prima del Dump ➔ Incassi x${ritornoSol} (+${(nettoSol*100).toFixed(0)}% Netto)`;
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
// =====================================================================
// 2. MOTORE AI (SWARM ARCHITECTURE)
// =====================================================================

// 🔥 2.1 IL MOTORE UNIVERSALE: Fa parlare qualsiasi Agente con Gemini
// 🔥 Mettilo in cima al file, sotto le altre variabili globali
let geminiCooldownEnd = 0; 

// 🔥 Sostituisci interrogaAgente con questa versione provvista di "Lucchetto"
// 🔥 Mettilo in cima al file, sotto le altre variabili globali (se non c'è già)
// let geminiCooldownEnd = 0; 
let apiCallTimestamps = [];
const MAX_CALLS_PER_MINUTE = 15;

function calcolaApiRimanenti() {
    const now = Date.now();
    // Filtra e tieni solo le chiamate fatte negli ultimi 60 secondi
    apiCallTimestamps = apiCallTimestamps.filter(t => now - t < 60000);
    const rimanenti = MAX_CALLS_PER_MINUTE - apiCallTimestamps.length;
    return Math.max(0, rimanenti);
}
// 🔥 IL MOTORE UNIVERSALE: Fa parlare qualsiasi Agente con Gemini
// 🔥 IL MOTORE UNIVERSALE: Alimentato da Groq (LLaMA 3) per aggirare i limiti Google
async function interrogaAgente(nomeAgente, prompt) {
    try {
        const rawKey = process.env.GROQ_API_KEY || "";
        const apiKey = rawKey.replace(/['"\s]/g, '');
        const url = `https://api.groq.com/openai/v1/chat/completions`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ 
                model: "llama-3.3-70b-versatile", // 🔥 AGGIORNATO AL NUOVO MODELLO
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" } 
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Errore API Groq");

        const text = data.choices[0].message.content;
        return JSON.parse(text);
        
    } catch (error) {
        console.error(`❌ Errore Agente [${nomeAgente}]:`, error.message);
        
        return { 
            errore: true, 
            messaggio: "Agente offline o dati corrotti",
            devStatus: "⚠️ SCONOSCIUTO - Rate Limit", 
            volumeStatus: "⚠️ SCONOSCIUTO - Rate Limit", 
            topHoldersStatus: "⚠️ SCONOSCIUTO - Rate Limit",
            sybilStatus: "⚠️ SCONOSCIUTO - Rate Limit", 
            estimatedRugTime: "⏱️ SCONOSCIUTO",
            strategy: `⛔ BLOCCO API: Passaggio in safe-mode.`,
            tradeSetup: `⏳ Attendi la stabilizzazione del nodo.`
        };
    }
}
// 🔥 2.2 IL COORDINATORE DELLO SCIAME (Sostituisce generateTacticalAdviceAI)
// 🔥 2.2 L'AGENTE MASTER (Sostituisce lo Swarm per evitare i limiti API di Google)
// 🔥 2.2 L'AGENTE MASTER
// 🔥 2.2 L'AGENTE MASTER (Modalità Spietata)
async function eseguiSwarmIntelligence(devWalletAgeHours, ubiData, bundledSupply, isFakeDev, sybilData, fedinaDev, orderFlowData) {
    
    const ubiPct = (ubiData && ubiData.totalTx > 0) ? ((ubiData.uniqueBuyers / ubiData.totalTx) * 100).toFixed(1) : 0;
    
    // 🛡️ FIX SYBIL: Traduciamo il JSON in un verdetto testuale brutale prima di passarlo all'IA
    let sybilStr = "⚠️ Troppo presto per mappare la rete";
    if (sybilData) {
        sybilStr = sybilData.rilevato 
            ? `🚨 PERICOLO: ${sybilData.numeroWallet} wallet controllano ${sybilData.supplyControllata}% (Funder Madre: ${sybilData.funderMadre}). In vendita: ${sybilData.inVendita}`
            : "🟢 PULITO: Top Holders indipendenti. Nessun Mixer rilevato.";
    }

    const fedinaStr = fedinaDev ? JSON.stringify(fedinaDev) : "Nessun dato";
    const flowStr = orderFlowData ? JSON.stringify(orderFlowData) : "Nessun dato Order Flow";

    console.log("🧠 Risveglio dell'Agente Master (Modalità Spietata)...");

    const promptMaster = `
    Sei l'Agente MASTER ISTITUZIONALE, un Risk Manager cinico, spietato e paranoico. Il tuo unico obiettivo è proteggere il capitale dai truffatori. Consideri ogni token uno SCAM fino a prova contraria e non ti fai ingannare da finte metriche di volume.
    
    DATI ON-CHAIN IN INGRESSO:
    - Età Dev: ${devWalletAgeHours}h (Fake Dev: ${isFakeDev})
    - Volume UBI: ${ubiPct}% wallet unici su ${ubiData ? ubiData.totalTx : 0} transazioni
    - Bundle Supply: ${bundledSupply}% controllata dai Top Holders
    - Rete Sybil (Cabala): ${sybilStr}
    - Storico Dev: ${fedinaStr}
    - Order Flow e Volatilità: ${flowStr}

    REGOLE RIGIDE DI COMPORTAMENTO:
    1. Se la "Rete Sybil" indica PULITO, il tuo "sybilStatus" deve essere "🟢 PULITO - Nessun legame". Se indica PERICOLO, deve essere "🚨 CABALA RILEVATA - Dump Programmato".
    2. Sii brutale nella "strategy". Usa un tono freddo e militare. Se i dati fanno schifo, ordina di stare alla larga. Se i dati sono buoni, suggerisci un'entrata rapida (Mordi e fuggi).
    3. Se manca un dato, scrivi "⏳ ANALISI IN CORSO", non scrivere "DATI MANCANTI".
    
    Restituisci ESCLUSIVAMENTE un JSON valido con queste 7 chiavi esatte:
    1. "devStatus": (Valuta la fedina penale e l'età del wallet)
    2. "volumeStatus": (Valuta l'UBI e l'Order Flow)
    3. "topHoldersStatus": (Valuta la Bundle Supply)
    4. "sybilStatus": (Valuta ESATTAMENTE la Rete Sybil fornita)
    5. "estimatedRugTime": (Stima cinica del tempo prima del dump)
    6. "strategy": (Il tuo verdetto brutale e spietato)
    7. "tradeSetup": (Azione finale: FUGA, WAIT, o SCALP con size)
    `;

    const sentenzaFinale = await interrogaAgente("Master", promptMaster);
    return sentenzaFinale;
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
                if (sigs.length === 0) continue; // 🔥
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

        const topHolders = largestAccs.value.slice(1, 11); // 📉 Ridotto a 10 per salvare i crediti RPC
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
// MOTORE QUANTITATIVO: ORDER FLOW E VOLATILITÀ (Dynamic Risk)
// =====================================================================
// =====================================================================
// MOTORE QUANTITATIVO: ORDER FLOW E VOLATILITÀ (Dynamic Risk)
// =====================================================================
// =====================================================================
// MOTORE QUANTITATIVO: ORDER FLOW E VOLATILITÀ (Dynamic Risk)
// =====================================================================
// =====================================================================
// 3. ANALISI COMPONENTI (VERSIONE OTTIMIZZATA IN LOCALE)
// =====================================================================
function analizzaUBI_Locale(txs) {
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
}

// =====================================================================
// 🔴 MOTORE PANIC SELL (Esecuzione Spietata)
// =====================================================================
function valutaInnescoPanicSell(mcAttuale, sogliaDump, microDumpData, orderFlowData) {
    let panicTrigger = false;
    let motivoPanic = "";
    
    // Configurazione di emergenza per scavalcare i bot del Dev
    const feeEmergenza = "0.01 SOL"; // Fee altissima per corrompere i validatori e passare per primi
    const slippageEmergenza = "50%"; // Non importa il prezzo, importa salvare il capitale

    // Grilletto 1: Vicinanza matematica al Dump del Bundle (Siamo all'85% della soglia critica)
    if (sogliaDump > 0 && mcAttuale >= (sogliaDump * 0.85)) {
        panicTrigger = true;
        motivoPanic = `Soglia critica del Bundle raggiunta (${(mcAttuale/1000).toFixed(1)}k / ${(sogliaDump/1000).toFixed(1)}k)`;
    }
    
    // Grilletto 2: Rilevato Micro-Dumping in corso dai Top Holders
    if (microDumpData && microDumpData.pericolo) {
        panicTrigger = true;
        motivoPanic = "Top Holders in fase di distribuzione (Micro-Dumping)";
    }

    // Grilletto 3: Crollo istantaneo della Buy Pressure
    if (orderFlowData && parseFloat(orderFlowData.buyPressure) < 20) {
        panicTrigger = true;
        motivoPanic = `Collasso Order Flow: Buy Pressure al ${orderFlowData.buyPressure}%`;
    }

    return {
        innescato: panicTrigger,
        motivo: motivoPanic,
        payloadEmergenza: panicTrigger ? {
            azione: "VENDITA IMMEDIATA 100%",
            priorityFee: feeEmergenza,
            slippage: slippageEmergenza,
            log: `🚨 PANIC SELL INNESCATO: ${motivoPanic}`
        } : null
    };
}

function analizzaOrderFlow_Locale(txs) {
    if (!txs || txs.length === 0) return null;
    let buyVolumeSol = 0; let sellVolumeSol = 0;
    let maxTxSize = 0; let microTxCount = 0;

    txs.forEach(tx => {
        if (!tx || !tx.meta || tx.meta.err) return;
        const feePayerIndex = 0; 
        const preSol = (tx.meta.preBalances[feePayerIndex] || 0) / 1e9;
        const postSol = (tx.meta.postBalances[feePayerIndex] || 0) / 1e9;
        const deltaSol = Math.abs(preSol - postSol);

        if (deltaSol > maxTxSize) maxTxSize = deltaSol;
        if (deltaSol < 0.05) microTxCount++;

        if (preSol > postSol) {
            buyVolumeSol += deltaSol;
        } else {
            sellVolumeSol += deltaSol;
        }
    });

    const totalVolume = buyVolumeSol + sellVolumeSol;
    const buyDeltaPct = totalVolume > 0 ? (buyVolumeSol / totalVolume) * 100 : 50;
    const volatilityIndex = (maxTxSize > 20 || (microTxCount / txs.length) > 0.8) ? "ESTREMA" : (maxTxSize > 5 ? "ALTA" : "NORMALE");

    return {
        buyPressure: buyDeltaPct.toFixed(1),
        volumeTotaleRecente: totalVolume.toFixed(2),
        maxOrder: maxTxSize.toFixed(2),
        volatilità: volatilityIndex
    };
}

// =====================================================================
// 4. API SCAN
// =====================================================================
app.get('/api/scan/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;
    avviaAscoltoLive(tokenMint);
    // 🧠 CONTROLLO CACHE: Se ho già analizzato questo token negli ultimi 15 secondi, restituisco il dato istantaneamente.
    if (scanCache.has(tokenMint)) {
        const cached = scanCache.get(tokenMint);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log(`⚡ CACHE HIT: Restituisco i dati di ${tokenMint} in 0ms`);
            return res.json(cached.data);
        }
    }

   try {
        console.log(`\n🔍 Scansione Avanzata ON-CHAIN per: ${tokenMint}`);
        const mintPubKey = new PublicKey(tokenMint);

        // 🛡️ 1° RESPIRO: Prima di calcolare il battito cardiaco
        await delay(1000);
        const velocityData = await analizzaBattitoCardiaco(mintPubKey);
        if (velocityData.blocco) {
            return res.json({
                score: 90, rischio: "ALTISSIMO / TRAPPOLA", dettagli: [`🛑 Battito Cardiaco MORTO`],
                graficoAttivo: false, vitaToken: "N/A", azione: "MORTO (Illiquido)", fugaColor: velocityData.colore,
                hud: { change: 0, volume: 0, trend: "N/A", color: "#444", icon: "💤" }, tradeValido: false,
                simulatoreTesto: `⛔ OPERAZIONE BLOCCATA: Zero compratori attivi. Liquidi persi.`, moltiplicatore: 0, targetMC: 0, prezzoSol: 150
            });
        }

        // 🛡️ 2° RESPIRO: Prima di controllare i bot del blocco 0
        await delay(1000);
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

        // 🛡️ 3° RESPIRO: Prima dell'estrazione generale delle firme
        await delay(1000);
        console.log("⚡ Estrazione Firme e Base...");
        // 📉 Riduciamo a 50 per azzerare totalmente i 429 di Helius
        const signatures = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 50 });
        const cabalaData = await analizzaCabalaSupply(mintPubKey);

        await delay(1000); // 🫁 Respiro per l'API

        // 🧠 2. IDENTIFICAZIONE DEL DEV E DELL'ETÀ DEL TOKEN
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

        await delay(1000); // 🫁 Respiro per l'API

        // 📊 3. CALCOLO VOLUMI E ORDER FLOW (OTTIMIZZATO IN SINGOLA CHIAMATA)
        console.log("⚡ Estrazione Transazioni (UBI & Order Flow unificati)...");
        const recentSigs = signatures.slice(0, 20).map(s => s.signature);
        let parsedTxs = [];
        
        // 📉 Ridotto il chunk size da 5 a 3 e aumentato il delay per proteggere l'RPC
        for (let i = 0; i < recentSigs.length; i += 3) {
            const chunk = recentSigs.slice(i, i + 3);
            await delay(1500); // 🫁 Respiro profondo obbligatorio per Helius
            try {
                const chunkTxs = await solanaConnection.getParsedTransactions(chunk, { maxSupportedTransactionVersion: 0 });
                parsedTxs.push(...chunkTxs);
            } catch(e) {
                console.log(`⚠️ Helius Drop nel chunk ${i}, procedo col prossimo...`);
            }
        }

        // Le funzioni matematiche elaborano i dati istantaneamente dalla RAM
        const ubiData = analizzaUBI_Locale(parsedTxs);
        const orderFlowData = analizzaOrderFlow_Locale(parsedTxs);

        await delay(1000); // 🫁 Respiro per l'API prima del Sybil Tree

        // 🕵️ 4. ANALISI MANIPOLAZIONE
        console.log("⚡ Analisi Dump e Sybil Tree...");
        const microDumpData = await analizzaMicroDumping(mintPubKey);
        const sybilData = await analizzaGrafoSybil(mintPubKey);

        // 🔥 5. LO SCIAME AI ENTRA IN AZIONE
        const tacticalAdvice = await eseguiSwarmIntelligence(
            walletAgeHours, 
            ubiData, 
            earlyBotData.supplyBundledPct, 
            isFakeDev, 
            sybilData, 
            fedinaDev,
            orderFlowData
        );
        logAnalisi.push(earlyBotData.indicatoreTesto);
        logAnalisi.push(`✅ Battito Cardiaco: ${velocityData.txMinuto} tx/min (Ultima tx: ${velocityData.secondiDaUltimaTx}s fa) - ${velocityData.stato}`);
        if (cabalaData && cabalaData.testo) logAnalisi.push(cabalaData.testo);
        if (microDumpData && microDumpData.testo) logAnalisi.push(microDumpData.testo);
        if (sybilData && sybilData.testo) logAnalisi.push(sybilData.testo);

        const clusterRisk = earlyBotData.bundleSlot0 ? 80 : 0;
        let simulazione = calcolaSimulazioneRendimento(currentFdv, isFakeDev, clusterRisk, earlyBotData.supplyBundledPct, tokenAgeMinutes, velocityData.txMinuto, orderFlowData);

        // 🔥 NUOVO: VALUTAZIONE PANIC SELL
        let sogliaDump = 0;
        if (earlyBotData.supplyBundledPct > 0) {
            sogliaDump = Math.floor(currentFdv * (1 + (100 - earlyBotData.supplyBundledPct) / 50));
        }
        
        const statoPanicSell = valutaInnescoPanicSell(currentFdv, sogliaDump, microDumpData, orderFlowData);
        
        if (statoPanicSell.innescato) {
            simulazione.azione = "🚨 PANIC SELL AUTO-TRIGGER";
            simulazione.coloreAzione = "#ff0000"; // Rosso puro
            simulazione.simulatoreTesto = statoPanicSell.payloadEmergenza.log;
            simulazione.raccomandazioneFees = { 
                slippage: statoPanicSell.payloadEmergenza.slippage, 
                fee: statoPanicSell.payloadEmergenza.priorityFee, 
                text: "💀 SALVATAGGIO CAPITALE" 
            };
        }

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

        // 👇 UNA SOLA DICHIARAZIONE PULITA
        let finalScore = isFakeDev ? 70 : (earlyBotData.bundleSlot0 ? 60 : 20);
        if (cabalaData) finalScore = Math.min(100, finalScore + cabalaData.scoreAggiuntivo);
        if (microDumpData) finalScore = Math.min(100, finalScore + microDumpData.scoreAggiuntivo);
        if (earlyBotData.supplyBundledPct >= 20) finalScore = 100; 
        if (fedinaDev) finalScore = Math.min(100, finalScore + fedinaDev.punteggioRischio);

        let rischioStatus = finalScore >= 80 ? "ALTISSIMO / TRAPPOLA" : (finalScore >= 60 ? "ALTO / MANIPOLATO" : "MODERATO");

        const risultatoFinale = {
            score: finalScore,
            rischio: rischioStatus,
            dettagli: logAnalisi,
            graficoAttivo: false,
            datiGrafico: null,
            devWallet: devWallet,
            advice: tacticalAdvice,
            apiRimanenti: typeof calcolaApiRimanenti === 'function' ? calcolaApiRimanenti() : 15,
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
            panicSellAttivo: statoPanicSell.innescato,
            motivoPanic: statoPanicSell.motivo,
            simulatoreTesto: simulazione.simulatoreTesto,
            moltiplicatore: simulazione.moltiplicatore,
            targetMC: simulazione.targetMC,
            prezzoSol: parseFloat(solPriceUsd),
            tradingFees: simulazione.raccomandazioneFees 
        };

        if (!tacticalAdvice.errore) {
            scanCache.set(tokenMint, { timestamp: Date.now(), data: risultatoFinale });
        }

        res.json(risultatoFinale);
    } catch (error) { 
        console.error("Errore Dettagliato API Scan:", error);
        res.status(500).json({ error: "Errore API" }); 
    }
});
// =====================================================================
// 🧠 API COPILOTA: REVISORE DI PATTERN LIVE (Groq LLaMA 3)
// =====================================================================
app.get('/api/copilot/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;
    const eventi = blackBoxEventi.get(tokenMint) || [];

    // Ora l'IA si attiva appena c'è anche solo 1 evento rilevante!
    if (eventi.length === 0) {
        return res.json({ 
            tattica: "Nessun movimento rilevante (Whale/Dump) intercettato dall'apertura.", 
            puntoRottura: "Attendi l'entrata di volumi direzionali.", 
            azione: "OSSERVARE" 
        });
    }

    const logTestuale = eventi.join("\n");
    const promptCopilota = `
    Sei un Analista Quantitativo specializzato in Memecoin su Solana.
    Ecco la sequenza temporale degli ultimi movimenti chiave (Smart Money, Bot, Micro-Dump e FOMO):
    
    ${logTestuale}
    
    Usa queste logiche per l'analisi:
    - Se vedi molti "DUMPING LENTO" continui, è una distribuzione controllata per rubare liquidità ai retail (Tattica: Bleeding/Distribuzione).
    - Se vedi "SMART MONEY -> BUY" seguito da "FOMO", le balene stanno accumulando (Tattica: Accumulo/Pump).
    - Se vedi bot e whale vendere contemporaneamente, il crollo è imminente.
    
    Rispondi ESCLUSIVAMENTE con un JSON puro con queste 3 chiavi, senza altri testi:
    {
      "tattica": "descrizione sintetica e spietata di cosa stanno facendo",
      "puntoRottura": "previsione di cosa succederà a brevissimo",
      "azione": "FUGGIRE / HOLD / COMPRARE / OSSERVARE"
    }
    `;

    console.log("🧠 Interrogazione Copilota Groq in corso con " + eventi.length + " eventi...");
    
    try {
        const analisiTattica = await interrogaAgente("Copilot", promptCopilota);
        res.json(analisiTattica);
    } catch (error) {
        console.error("Errore IA Copilota:", error);
        res.json({ tattica: "Errore di connessione Groq", puntoRottura: "Sconosciuto", azione: "ATTESA" });
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
// Sostituisci app.listen con server.listen
server.listen(PORT, () => {
    console.log(`🚀 Server Radar & WebSocket avviati sulla porta ${PORT}`);
});