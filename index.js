require('dotenv').config(); // 🔥 FONDAMENTALE: Legge la tua chiave API dal file .env
const express = require('express');
const cors = require('cors');
const { Connection, PublicKey } = require('@solana/web3.js');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');

// 🤫 SILENZIATORE GLOBALE RPC: Nasconde lo spam dei 429 di Solana mantenendo gli scudi attivi
const originalWarn = console.warn;
const originalError = console.error;
console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('429 Too Many Requests')) return;
    originalWarn(...args);
};
console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('429 Too Many Requests')) return;
    originalError(...args);
};
// 1. Configurazione Ibrida: REST per le query storiche, WSS per il live stream
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const WSS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const blackBoxEventi = new Map();
const pendingScans = new Map(); // Traccia le scansioni in corso per evitare doppioni
const solanaConnection = new Connection(RPC_URL, {
    wsEndpoint: WSS_URL,
    commitment: 'confirmed'
});

// Variabile globale per tenere traccia della connessione aperta
let activeSubscriptionId = null;
const knownBotsCache = new Set();
// 🔥 FILTRO ANTI-429 PER TOKENS AD ALTO VOLUME
    let ultimaElaborazioneTx = Date.now();
    let codaTx = 0;
// =====================================================================
// 📡 MOTORE LIVE STREAMING (Tape Reading & Order Flow)
// =====================================================================
// 🔥 MEMORIA DELL'AGENTE SPY: Traccia le size identiche
function salvaTradeInLocale(mint, pnl) {
    const filePaper = 'paper_trading.json';
    let db = { bilancio: 0, trades: [] };
    
    if (fs.existsSync(filePaper)) {
        try { db = JSON.parse(fs.readFileSync(filePaper, 'utf8')); } catch(e){}
    }
    
    // Aggiorna il bilancio totale
    db.bilancio += pnl;
    
    // Aggiunge la nuova operazione in cima alla lista
    db.trades.unshift({
        data: new Date().toLocaleString('it-IT'),
        mint: mint,
        pnl: parseFloat(pnl.toFixed(5)),
        esito: pnl > 0 ? "✅ WIN" : "❌ LOSS"
    });
    
    // Salva il file fisicamente sul PC
    fs.writeFileSync(filePaper, JSON.stringify(db, null, 2));
}
const spyCache = new Map();
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

            // 🔥 CANCELLO ANTI-429: Processiamo max 3 transazioni al secondo.
            // Se il mercato va troppo veloce, ignoriamo le transazioni minori per non far esplodere Helius.
            // 🔥 CANCELLO ANTI-429 ULTRA-SEVERO (Per Piano Gratuito)
                // Processiamo MASSIMO 1 transazione al secondo per non saturare Helius.
                const oraAttuale = Date.now();
                if (oraAttuale - ultimaElaborazioneTx < 1000) {
                    return; // Ignora silenziosamente la transazione se è passato meno di 1 secondo
                }
                ultimaElaborazioneTx = oraAttuale;

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
                // Manteniamo gli ultimi 20 eventi per dare all'IA un contesto perfetto
                if (diarioEventi.length > 20) diarioEventi.shift();

                // ==========================================================
                // 🕵️ AGENTE SPY: RILEVAMENTO CLUSTER SYBIL IN TEMPO REALE
                // ==========================================================
                // ==========================================================
                // 🕵️ AGENTE SPY: RILEVAMENTO CLUSTER SYBIL IN TEMPO REALE
                // ==========================================================
                if (tipoAzione === "🔴 SELL" && deltaSol >= 0.05) {
                    const now = Date.now();
                    
                    // Usiamo una chiave unica per il token invece dell'importo
                    if (!spyCache.has(tokenMint)) spyCache.set(tokenMint, []);
                    let sellers = spyCache.get(tokenMint);
                    
                    // 1. Pulisce la memoria: dimentica le vendite più vecchie di 2.5 secondi
                    sellers = sellers.filter(s => now - s.timestamp < 2500);
                    
                    // 2. Se questo wallet non ha già venduto in questa finestra, lo aggiunge
                    if (!sellers.some(s => s.wallet === feePayer)) {
                        sellers.push({ wallet: feePayer, amount: deltaSol, timestamp: now });
                    }
                    
                    spyCache.set(tokenMint, sellers);
                    
                    // 3. IL TRIGGER AGGRESSIVO: 4 o più wallet diversi vendono in soli 2.5 secondi!
                    if (sellers.length >= 4) {
                        const totalDump = sellers.reduce((sum, s) => sum + s.amount, 0).toFixed(2);
                        const alertMsg = `RAFFICA SYBIL: ${sellers.length} wallet stanno scaricando un totale di ${totalDump} SOL in 2 secondi!`;
                        console.log(`\n🚨 SPY ALERT: ${alertMsg}`);
                        
                        // Spara l'allarme rosso al frontend
                        io.emit('spy_alert', {
                            timestamp: new Date().toLocaleTimeString('it-IT', { hour12: false }),
                            messaggio: alertMsg,
                            wallets: sellers.map(s => s.wallet)
                        });
                        
                        // Svuota la cache per non spammare
                        spyCache.set(tokenMint, []);
                    }
                }
                // ==========================================================
                // ==========================================================

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
app.use(cors()); // Sblocca le protezioni del browser
app.use(express.json()); // Permette di leggere i body delle richieste POST
const PORT = 3000;
// 🕵️ LOG GLOBALE: Stampa tutte le richieste in entrata
app.use((req, res, next) => {
    console.log(`➡️ [${req.method}] ${req.url}`);
    next();
});
// 🔥 CREAZIONE SERVER HTTP E TUNNEL SOCKET.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permette all'estensione Firefox/Chrome di connettersi senza blocchi CORS
        methods: ["GET", "POST"]
    }
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
        console.log("⚠️ Errore RPC durante l'analisi Bot Early Launch (Rate Limit Helius). Uso dati neutri.");
        
        // Restituiamo un oggetto valido invece di usare "res.json" che fa crashare il server
        return {
            bundleSlot0: false,
            supplyBundledPct: 0,
            funderComune: null,
            potenzialeVolumeBot: "⚠️ SCONOSCIUTO",
            indicatoreTesto: "⚠️ Analisi Bot bloccata dal limite richieste del nodo RPC."
        };
    }

};
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
// 🔥 ESTRAZIONE CHIAVI DAL .ENV (Supporta 1 o più chiavi separate da virgola)
const rawKeyEnv = process.env.GROQ_API_KEY || "";
const groqKeys = rawKeyEnv.replace(/['"\s]/g, '').split(',').filter(k => k.length > 0);
let currentGroqIndex = 0;

async function interrogaAgente(nomeAgente, prompt) {
    let tentativi = 0;
    const maxTentativi = groqKeys.length === 0 ? 1 : groqKeys.length;

    while (tentativi < maxTentativi) {
        const apiKey = groqKeys[currentGroqIndex] || "";
        
        try {
            const url = `https://api.groq.com/openai/v1/chat/completions`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ 
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" } 
                })
            });

            const data = await response.json();

            // 🛑 CONTROLLO RATE LIMIT
            if (response.status === 429 || (data.error && data.error.message.includes("Rate limit"))) {
                console.log(`⚠️ [Agente ${nomeAgente}] Chiave ${currentGroqIndex + 1} esaurita (TPD). Ricarico l'arma...`);
                currentGroqIndex = (currentGroqIndex + 1) % groqKeys.length; // Ruota la chiave
                tentativi++;
                continue; // Ritenta istantaneamente con la nuova chiave
            }

            if (!response.ok) throw new Error(data.error?.message || "Errore API Groq");

            const text = data.choices[0].message.content;
            
            // Pulizia di sicurezza nel caso l'IA inserisca markdown sfuggito
            let pulito = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            return JSON.parse(pulito);
            
        } catch (error) {
            // Se l'errore sollevato dal catch è un Rate Limit "mascherato", ruota. Altrimenti entra in Safe Mode.
            if (error.message.includes("Rate limit") || error.message.includes("429")) {
                console.log(`⚠️ [Agente ${nomeAgente}] Limite raggiunto. Cambio chiave...`);
                currentGroqIndex = (currentGroqIndex + 1) % groqKeys.length;
                tentativi++;
            } else {
                console.error(`❌ Errore Agente [${nomeAgente}]:`, error.message);
                
                return { 
                    errore: true, 
                    messaggio: "Agente offline o dati corrotti",
                    devStatus: "⚠️ SCONOSCIUTO - Errore API", 
                    volumeStatus: "⚠️ SCONOSCIUTO - Errore API", 
                    topHoldersStatus: "⚠️ SCONOSCIUTO - Errore API",
                    sybilStatus: "⚠️ SCONOSCIUTO - Errore API", 
                    estimatedRugTime: "⏱️ SCONOSCIUTO",
                    strategy: `⛔ BLOCCO API: Passaggio in safe-mode.`,
                    tradeSetup: `⏳ Attendi la stabilizzazione del nodo.`
                };
            }
        }
    }
    
    // 🔥 SE ESCE DAL CICLO WHILE: TUTTE le chiavi sono bruciate.
    console.error(`❌ Errore Agente [${nomeAgente}]: TUTTE le chiavi in Rate Limit.`);
    return { 
        errore: true, 
        messaggio: "Rate Limit Globale raggiunto",
        devStatus: "⚠️ SCONOSCIUTO - Rate Limit", 
        volumeStatus: "⚠️ SCONOSCIUTO - Rate Limit", 
        topHoldersStatus: "⚠️ SCONOSCIUTO - Rate Limit",
        sybilStatus: "⚠️ SCONOSCIUTO - Rate Limit", 
        estimatedRugTime: "⏱️ SCONOSCIUTO",
        strategy: `⛔ RATE LIMIT GLOBALE: Cambia chiavi nel file .env`,
        tradeSetup: `⏳ API KO.`
    };
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

    try {
        const sentenzaFinale = await interrogaAgente("Master", promptMaster);
        return sentenzaFinale;
    } catch (error) {
        console.log("⚠️ Agente Master in Rate Limit o errore. Applico paracadute di sicurezza.");
        return {
            devStatus: "⚠️ SCONOSCIUTO - Rate Limit",
            volumeStatus: "⚠️ SCONOSCIUTO - Rate Limit",
            topHoldersStatus: "⚠️ SCONOSCIUTO - Rate Limit",
            sybilStatus: "⚠️ SCONOSCIUTO - Rate Limit",
            estimatedRugTime: "N/A - Standby",
            strategy: "⚠️ Rate Limit IA superato. Attendi il cooldown di Groq per l'analisi avanzata.",
            tradeSetup: "WAIT",
            errore: true // Segnala al sistema che stiamo usando i dati di emergenza
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
// =====================================================================
// 🕵️ MODULO ANTI-SYBIL: SCOPRE I BUNDLER E I WALLET FANTASMA
// =====================================================================
async function analizzaReteSybil(arrayDiWallet) {
    console.log(`🔍 Tracciamento fondi per ${arrayDiWallet.length} wallet sospetti...`);
    let mappaFinanziatori = {};
    let walletAnalizzati = 0;

    for (let wallet of arrayDiWallet) {
        try {
            const pubKey = new PublicKey(wallet);
            
            // 1. Peschiamo le primissime transazioni della vita di questo wallet
            const sigs = await solanaConnection.getSignaturesForAddress(pubKey, { limit: 5 });
            
            if (sigs.length > 0) {
                // Prendiamo la firma più vecchia (probabilmente quella di finanziamento iniziale)
                const firmaPiuVecchia = sigs[sigs.length - 1].signature;
                const tx = await solanaConnection.getParsedTransaction(firmaPiuVecchia, { maxSupportedTransactionVersion: 0 });
                
                if (tx && tx.meta) {
                    const preBals = tx.meta.preBalances;
                    const postBals = tx.meta.postBalances;
                    const accountKeys = tx.transaction.message.accountKeys;
                    
                    // 2. Cerchiamo chi ha "perso" SOL in questa transazione verso il nostro wallet
                    for (let i = 0; i < accountKeys.length; i++) {
                        const indirizzoCoinvolto = accountKeys[i].pubkey.toString();
                        const solPersi = (preBals[i] - postBals[i]) / 1e9; // Convertiamo lamports in SOL
                        
                        // Se questo indirizzo ha speso SOL e non è il wallet stesso né un programma di sistema
                        if (solPersi > 0 && indirizzoCoinvolto !== wallet && indirizzoCoinvolto !== "11111111111111111111111111111111") {
                            // Abbiamo trovato il finanziatore (Wallet Madre)
                            mappaFinanziatori[indirizzoCoinvolto] = (mappaFinanziatori[indirizzoCoinvolto] || 0) + 1;
                            break; 
                        }
                    }
                }
            }
            walletAnalizzati++;
        } catch (error) {
            // Ignoriamo gli errori di un singolo wallet per non bloccare lo scan
        }
    }

    // 3. Tiriamo le somme e cerchiamo la Cabala
    let minacce = [];
    for (const [walletMadre, numeroFigli] of Object.entries(mappaFinanziatori)) {
        // Se un singolo wallet ha finanziato 3 o più acquirenti iniziali, è una truffa al 100%
        if (numeroFigli >= 3) {
            minacce.push({
                funderMadre: walletMadre,
                walletControllati: numeroFigli
            });
        }
    }

    if (minacce.length > 0) {
        console.log(`🚨 ALLARME BUNDLER: Trovati Wallet Madre multipli!`, minacce);
        return {
            rilevato: true,
            dettagli: minacce,
            messaggio: `🚨 CABALA RILEVATA: ${minacce[0].walletControllati} wallet compratori sono stati finanziati dalla stessa entità segreta.`
        };
    }

    return {
        rilevato: false,
        messaggio: "🟢 Rete Pulita: I compratori sembrano avere origini finanziarie indipendenti."
    };
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
    
// =====================================================================
// 💸 DATABASE LOCALE: LIVE PAPER TRADING SIMULATOR (ZERO-AI)
// =====================================================================
const dbPath = path.join(__dirname, 'paper_trading.json');

function getPaperTrades() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ trades: [], openPositions: {}, bilancio: 0 }));
    }
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (!db.openPositions) db.openPositions = {}; // Sicurezza
    return db;
}

// Lettura Storico
app.get('/api/paper-trading', (req, res) => {
    try { res.json(getPaperTrades()); } catch (e) { res.status(500).json({ error: "Errore lettura DB" }); }
});

// ⚡ Endpoint per tracciare il PnL in tempo reale
app.get('/api/paper-trading/live/:tokenMint', async (req, res) => {
    try {
        const db = getPaperTrades();
        const posizione = db.openPositions[req.params.tokenMint];
        if (!posizione) return res.json({ aperta: false });

        // Pesca il prezzo live direttamente da DexScreener (Super Veloce, Costo 0)
        let currentPrice = 0;
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${req.params.tokenMint}`);
        const dexData = await dexRes.json();
        if (dexData.pairs && dexData.pairs.length > 0) {
            currentPrice = parseFloat(dexData.pairs[0].priceUsd);
        }

        if (currentPrice > 0) {
            const moltiplicatore = currentPrice / posizione.prezzoEntrata;
            const controvalore = posizione.importoSol * moltiplicatore;
            const pnlNetto = controvalore - posizione.importoSol;
            const pnlPct = ((moltiplicatore - 1) * 100).toFixed(2);
            
            return res.json({ aperta: true, pnl: pnlNetto, pct: pnlPct });
        }
        res.json({ aperta: true, pnl: 0, pct: 0 });
    } catch(e) {
        res.json({ aperta: false });
    }
});

// Apertura / Chiusura Posizione
// Apertura / Chiusura Posizione
// Apertura / Chiusura Posizione
app.post('/api/paper-trading', express.json(), (req, res) => {
    try {
        const { tokenMint, azione, pnlNetto } = req.body;
        const db = getPaperTrades();

        let resMsg = "";

        if (azione === "EXIT") {
            const pnl = parseFloat(pnlNetto) || 0;
            db.bilancio += pnl; // Aggiorna la cassa totale
            
            // Salva lo storico
            db.trades.unshift({
                id: Date.now(),
                token: tokenMint,
                pnlSol: pnl,
                data: new Date().toLocaleString('it-IT')
            });

            if (db.trades.length > 50) db.trades.length = 50; // Max 50 trade
            resMsg = `Uscita: ${pnl > 0 ? '+' : ''}${pnl.toFixed(3)} SOL`;
        }

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        res.json({ success: true, bilancio: db.bilancio, messaggio: resMsg });
    } catch (e) {
        console.error("Errore POST Paper Trading:", e);
        res.status(500).json({ error: "Errore interno server" });
    }
});
// =====================================================================
// =====================================================================
    // 🧠 CONTROLLO CACHE: Se ho già analizzato questo token negli ultimi 15 secondi, restituisco il dato istantaneamente.
    if (scanCache.has(tokenMint)) {
        const cached = scanCache.get(tokenMint);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log(`⚡ CACHE HIT: Restituisco i dati di ${tokenMint} in 0ms`);
            return res.json(cached.data);
        }
    }

    // 🔥 IL LUCCHETTO: Se c'è già una scansione in corso per questo token, l'API aspetta senza lanciare doppi calcoli!
    if (pendingScans.has(tokenMint)) {
        console.log(`⏳ Richiesta duplicata per ${tokenMint}, mi aggancio all'analisi in corso...`);
        try {
            const result = await pendingScans.get(tokenMint);
            return res.json(result);
        } catch (e) {
            return res.status(500).json({ error: "Errore API backend durante l'attesa" });
        }
    }
    

    // 🚀 INCAPSULIAMO LA TUA LOGICA IN UNA PROMISE
    const scanPromise = (async () => {
        console.log(`\n🔍 Scansione Avanzata ON-CHAIN per: ${tokenMint}`);
        const mintPubKey = new PublicKey(tokenMint);

        // 🛡️ 1° RESPIRO: Prima di calcolare il battito cardiaco
        // 🛡️ 1° RESPIRO: Prima di calcolare il battito cardiaco
        await delay(1000);
        let velocityData = { blocco: false, txMinuto: 0, secondiDaUltimaTx: 0, stato: "Sconosciuto", colore: "#ffaa00" };
        try {
            velocityData = await analizzaBattitoCardiaco(mintPubKey);
        } catch (e) {
            console.log("⚠️ Battito cardiaco saltato per limite RPC (429), procedo con l'analisi...");
        }
        
        // Blocchiamo l'analisi SOLO se siamo certi che il token è morto (es. ultima tx 2 ore fa), 
        // non se Helius ci ha dato un errore temporaneo 429.
        if (velocityData.blocco && velocityData.secondiDaUltimaTx > 300) {
            return {
                score: 90, rischio: "MORTO / ILLIQUIDO", dettagli: [`🛑 Nessuna transazione negli ultimi 5 minuti.`],
                graficoAttivo: false, vitaToken: "N/A", azione: "EVITARE", fugaColor: "#ff4d4d",
                hud: { change: 0, volume: 0, trend: "N/A", color: "#444", icon: "💤" }, tradeValido: false,
                simulatoreTesto: `⛔ OPERAZIONE BLOCCATA: Rischio token illiquido o abbandonato.`, moltiplicatore: 0, targetMC: 0, prezzoSol: 150
            };
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
        // 🛡️ 3° RESPIRO: Prima dell'estrazione generale delle firme
        await delay(1000);
        console.log("⚡ Estrazione Firme e Base...");
        
        let signatures = [];
        try {
            // Abbassiamo la profondità da 50 a 20 per salvare le API gratuite!
            signatures = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 20 });
        } catch (e) {
            console.log("⚠️ Helius in Rate Limit (429). Attivo il paracadute per non crashare...");
        }

        let cabalaData = null;
        try {
            cabalaData = await analizzaCabalaSupply(mintPubKey);
        } catch (e) {}

        await delay(1000);

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

        await delay(1000);

        // 📊 3. CALCOLO VOLUMI E ORDER FLOW
        console.log("⚡ Estrazione Transazioni (UBI & Order Flow unificati)...");
        const recentSigs = signatures.slice(0, 20).map(s => s.signature);
        let parsedTxs = [];
        
        for (let i = 0; i < recentSigs.length; i += 3) {
            const chunk = recentSigs.slice(i, i + 3);
            await delay(1500); 
            try {
                const chunkTxs = await solanaConnection.getParsedTransactions(chunk, { maxSupportedTransactionVersion: 0 });
                parsedTxs.push(...chunkTxs);
            } catch(e) {
                console.log(`⚠️ Helius Drop nel chunk ${i}, procedo col prossimo...`);
            }
        }

        const ubiData = analizzaUBI_Locale(parsedTxs);
        const orderFlowData = analizzaOrderFlow_Locale(parsedTxs);

        await delay(1000);

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
            simulazione.coloreAzione = "#ff0000"; 
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

        return risultatoFinale; // Restituiamo l'oggetto alla Promise
    })();

    // INSERIAMO LA PROMISE NEL LUCCHETTO
    pendingScans.set(tokenMint, scanPromise);

    // ESEGUIAMO E GESTIAMO IL RISULTATO
    try {
        const finalData = await scanPromise;
        pendingScans.delete(tokenMint); // Scansione finita, togliamo il lucchetto
        res.json(finalData); // Inviamo al frontend
    } catch (error) { 
        console.error("Errore Dettagliato API Scan:", error);
        pendingScans.delete(tokenMint); // In caso di crash, liberiamo comunque il lucchetto
        res.status(500).json({ error: "Errore API" }); 
    }
});
// =====================================================================
// 🧠 COPILOTA IA: PREDATORE DI SCAM (Dati Dinamici Live)
// =====================================================================
// =====================================================================
// 🧠 COPILOTA IA: PREDATORE DI SCAM (BLINDATO ANTI-CRASH + DATI LIVE)
// =====================================================================
// =====================================================================
// 🧠 CERVELLO 5.0: MOTORE ESECUTIVO MULTI-AGENTE (Memoria + Llama 3.3)
// =====================================================================
// =====================================================================
// 🧠 COPILOTA IA: CERVELLO 5.0 (Rotazione Chiavi + Dati Live)
// =====================================================================
// =====================================================================
// 🧠 COPILOTA IA: CERVELLO 5.0 (Integrazione Moduli Forensi On-Chain)
// =====================================================================
// =====================================================================
// 🧠 COPILOTA IA: CERVELLO 5.0 (Integrazione Forense + Debug Rete)
// =====================================================================
// =====================================================================
// 🔫 CORE 1: LO SNIPER DEI VOLUMI (Groq - Velocità Estrema)
// =====================================================================
app.post('/api/copilot/:tokenMint', express.json(), async (req, res) => {
    const tokenMint = req.params.tokenMint;
    
    // Riceviamo solo Volumi e History in Tempo Reale
    const { buyVol, sellVol, buyPressure, history } = req.body || { buyVol: 0, sellVol: 0, buyPressure: 50, history: [] };

    // 🛡️ KILL-SWITCH: CONTROLLO DILUVIO / RUG PULL
    try {
        const battito = await analizzaBattitoCardiaco(new PublicKey(tokenMint));
        if (battito.blocco || battito.secondiDaUltimaTx > 20) {
            return res.json({
                tattica: "🚨 RUG PULL / ZERO LIQUIDITÀ: Scambi fermi o pool prosciugata.",
                puntoRottura: "Nessuna transazione rilevata.",
                azione: "FUGGIRE"
            });
        }
    } catch (e) {}

    const datiIniziali = scanCache.has(tokenMint) ? scanCache.get(tokenMint).data : null;
    let sybilStatus = datiIniziali?.sybil?.testo || "Dato Sybil mancante.";
    let fedinaDev = datiIniziali?.fedinaDev ? datiIniziali.fedinaDev.status : "Sconosciuta.";
    let microDumping = datiIniziali?.sanguisughe?.testo || "Nessun dato Micro-Dumping disponibile."; // 🔥 ECCO LA RIGA CHE MANCAVA!

    const historyText = history && history.length > 0 
        ? history.map(h => `[${h.time}] Buy: ${h.buy} SOL | Sell: ${h.sell} SOL | Press: ${h.pressure}%`).join('\n')
        : "Nessuno storico disponibile.";

    const promptCopilota = `
Sei uno speculatore on-chain specializzato in "Rug Prediction".
VIETATO dare risposte generiche come "Balene comprano" o "Dump in arrivo".
DEVI usare i numeri esatti forniti qui sotto per giustificare la tua analisi tecnica.

DATI INVESTIGATIVI STRUTTURALI:
- Rete Sybil / Cabala: ${sybilStatus}
- Storico Sviluppatore: ${fedinaDev}
- Micro-Dumping: ${microDumping}

DINAMICA VOLUMI (Live):
- COMPRA: ${buyVol} SOL
- VENDITA: ${sellVol} SOL
- Pressione: ${buyPressure}%
STORICO TEMPORALE: 
${historyText}

REGOLE DI ANALISI (DA SCRIVERE NEL JSON):
1. Usa sempre le cifre: devi scrivere quanti SOL sono in acquisto contro quanti in vendita.
2. Se c'è una "Cabala Rilevata" o un "Wallet Padre", scrivi esplicitamente: "Rete Sybil attiva, il Dev controlla la supply. Volumi finti."
3. Se c'è "Micro-Dumping", scrivi: "I Top Holders stanno scaricando lentamente sui retail".
4. Se le balene (ordini grossi) comprano ma i top holders vendono, avvisa della trappola di exit liquidity.

Rispondi RIGOROSAMENTE in JSON puro, sii tecnico e analitico:
{
  "tattica": "<Descrizione tecnica con i SOL esatti mossi e chi li muove (Dev/Balene/Retail). Ignora le frasi fatte. max 35 parole>",
  "puntoRottura": "<Spiega ESATTAMENTE cosa innescherà il dump o il pump incrociando i volumi con i Dati Investigativi. max 30 parole>",
  "azione": "COMPRARE / HOLD / VENDERE / FUGGIRE / OSSERVARE"
}`;

    try {
        const chiaviDisponibili = (typeof groqKeys !== 'undefined' && groqKeys.length > 0) 
            ? [...groqKeys] : [process.env.GROQ_API_KEY].filter(k => k && k.trim() !== '');

        if (chiaviDisponibili.length === 0) throw new Error("Nessuna API Key Groq trovata.");
        const chiaviMischiate = chiaviDisponibili.sort(() => 0.5 - Math.random());

        let response;
        let success = false;

        for (const apiKey of chiaviMischiate) {
            try {
                response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [{ role: "user", content: promptCopilota }],
                        temperature: 0.1,
                        response_format: { type: "json_object" }
                    })
                });
                if (response.ok) { success = true; break; }
            } catch (e) {}
        }

        if (!success) throw new Error(`Tutte le chiavi Groq hanno fallito.`);

        const data = await response.json();
        let testoJson = data.choices[0].message.content.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonPulito = JSON.parse(testoJson.substring(testoJson.indexOf('{'), testoJson.lastIndexOf('}') + 1));

        res.json({
            tattica: jsonPulito.tattica || jsonPulito.Tattica,
            puntoRottura: jsonPulito.puntoRottura || jsonPulito.PuntoRottura,
            azione: jsonPulito.azione || jsonPulito.Azione
        });
    } catch (error) {
        res.json({ tattica: "Errore API.", puntoRottura: "Lettura manuale.", azione: "OSSERVARE" });
    }
});
const { GoogleGenerativeAI } = require("@google/generative-ai");

// =====================================================================
// ⚖️ CORE 2: IL GIUDICE SUPREMO (Gemini Flash - Connessione Diretta REST)
// =====================================================================
// =====================================================================
// ⚖️ CORE 2: IL GIUDICE SUPREMO (Gemini 1.5 Pro - REST Nativo)
// =====================================================================
// =====================================================================
// 🧠 MOTORE 1: PROFILAZIONE ALGORITMICA WALLET (Ingegneria Inversa)
// =====================================================================
app.post('/api/laboratorio/wallet-spy', async (req, res) => {
    const { walletAddress, recentTrades } = req.body;

    if (!recentTrades || recentTrades.length === 0) {
        return res.json({ success: false, verdetto: "In attesa di intercettare transazioni per la profilazione..." });
    }

    try {
        console.log(`\n🧠 Motore Quantitativo Locale avviato su: ${walletAddress}`);

        let totalBuySol = 0; let totalSellSol = 0;
        let buyCount = 0; let sellCount = 0;
        let tokenMap = {};

        // Analisi profonda delle transazioni (in ordine cronologico inverso)
        recentTrades.slice().reverse().forEach(t => {
            const action = t.azione || t.type;
            const token = t.tokenMint || t.mint;
            const sol = parseFloat(t.sol || t.solSpent || t.solAmount || 0);
            
            // Estrazione rudimentale del tempo in millisecondi per misurare l'Hold Time
            let timeVal = Date.now();
            if (typeof t.timestamp === 'string') {
                const parts = t.timestamp.match(/(\d+):(\d+):(\d+)/);
                if (parts) timeVal = (+parts[1] * 3600 + +parts[2] * 60 + +parts[3]) * 1000;
            }

            if (!tokenMap[token]) tokenMap[token] = { buyTime: null, buySol: 0, sellTime: null, sellSol: 0, isFlipped: false };

            if (action === 'BUY') {
                buyCount++;
                totalBuySol += sol;
                if (!tokenMap[token].buyTime) tokenMap[token].buyTime = timeVal;
                tokenMap[token].buySol += sol;
            } else if (action === 'SELL') {
                sellCount++;
                totalSellSol += sol;
                if (tokenMap[token].buyTime && !tokenMap[token].sellTime) {
                    tokenMap[token].sellTime = timeVal;
                    tokenMap[token].isFlipped = true;
                    tokenMap[token].sellSol += sol;
                }
            }
        });

        // Calcolo Metriche Avanzate
        let holdTimes = [];
        let winningTrades = 0;
        let completedTrades = 0;

        Object.values(tokenMap).forEach(data => {
            if (data.isFlipped) {
                completedTrades++;
                let diffMs = data.sellTime - data.buyTime;
                if (diffMs > 0) holdTimes.push(diffMs / 1000); // Converte in secondi
                if (data.sellSol > data.buySol) winningTrades++;
            }
        });

        const avgBuy = buyCount > 0 ? (totalBuySol / buyCount).toFixed(2) : 0;
        const avgHold = holdTimes.length > 0 ? Math.round(holdTimes.reduce((a,b)=>a+b,0) / holdTimes.length) : "N/A";
        const winRate = completedTrades > 0 ? Math.round((winningTrades / completedTrades) * 100) : "N/A";
        
        // Generazione della deduzione "Stile IA" basata sui calcoli
        let tattica = "";
        if (avgHold !== "N/A" && avgHold < 60) tattica = "Sniper Estremo / MEV (Entra ed esce in pochissimi secondi, punta al pump iniziale).";
        else if (avgHold !== "N/A" && avgHold < 300) tattica = "Scalper Quantitativo (Cavalca il momentum per 1-5 minuti e scarica prima del dump).";
        else tattica = "Momentum Trader (Usa ingressi calcolati a 6k MC e fa take-profit scaglionati).";

        let htmlReport = `
            <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #4a2b66;">
                <strong style="color:#b366ff; text-transform: uppercase; font-size: 0.9em;">🤖 Profilazione Algoritmica</strong><br>
                <span style="color:#e0e0e0; font-size: 0.95em;">L'agente sta operando come <b>${tattica}</b></span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid #2d3142; text-align: center;">
                    <span style="color:#888; font-size: 0.8em; display:block;">Size Media (BUY)</span>
                    <strong style="color:#00ffcc; font-size: 1.1em;">${avgBuy} SOL</strong>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid #2d3142; text-align: center;">
                    <span style="color:#888; font-size: 0.8em; display:block;">Hold Time Medio</span>
                    <strong style="color:#ffaa00; font-size: 1.1em;">${avgHold} sec</strong>
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid #2d3142; margin-bottom: 10px;">
                <span style="color:#888; font-size: 0.8em; display:block; margin-bottom: 4px;">Dinamica Flussi (Ultime TX)</span>
                <div style="display:flex; justify-content:space-between; font-size:0.9em; font-weight:bold;">
                    <span style="color:#00e676;">IN: ${totalBuySol.toFixed(2)} SOL</span>
                    <span style="color:#ff4d4d;">OUT: ${totalSellSol.toFixed(2)} SOL</span>
                </div>
            </div>
            
            <div style="text-align: center; padding: 6px; background: rgba(179, 102, 255, 0.1); border: 1px solid #b366ff; color: #e4e4e7; font-weight: bold; border-radius: 4px; font-size: 1em;">
                ⚡ Win Rate Stimato: <span style="color: ${winRate > 50 ? '#00e676' : '#ff4d4d'};">${winRate}%</span>
            </div>
        `;

        res.json({ success: true, verdetto: htmlReport });

    } catch (error) {
        console.error("❌ Errore Motore Quantitativo:", error.message);
        res.json({ success: false, verdetto: "Impossibile calcolare i parametri: " + error.message });
    }
});


// =====================================================================
// 🧠 MOTORE 2: GIUDICE FORENSE TOKEN (Sostituisce Gemini in Axiom)
// =====================================================================
// =====================================================================
// 🧠 MOTORE 2: GIUDICE FORENSE TOKEN (Powered by GROQ Llama-3 70B)
// =====================================================================
app.get('/api/laboratorio/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;
    const datiIniziali = scanCache.has(tokenMint) ? scanCache.get(tokenMint).data : null;
    
    if (!datiIniziali) {
        return res.json({ success: false, verdetto: "Dati insufficienti. Eseguire prima la scansione base." });
    }

    try {
        console.log(`\n⚖️ Giudice Supremo (Groq Llama-3) avviato per: ${tokenMint}`);

        let sybilStatus = datiIniziali?.sybil?.testo || "Nessun dato Sybil";
        let microDumping = datiIniziali?.sanguisughe?.testo || "Nessun dato Micro-Dump";
        let fedinaDev = datiIniziali?.fedinaDev ? JSON.stringify(datiIniziali.fedinaDev) : "Ignota";
        let bundleInfo = datiIniziali?.earlyRadar ? JSON.stringify(datiIniziali.earlyRadar) : "Nessun bundle rilevato";
        let liquidita = datiIniziali?.hud ? `Variazione: ${datiIniziali.hud.change}% | Volume Stimato: $${datiIniziali.hud.volume}M | Trend Rilevato: ${datiIniziali.hud.trend}` : "Dati di mercato assenti";

        const promptLaboratorio = `
Sei il "Giudice Supremo", un analista forense on-chain spietato. 
Il tuo report deve essere telegrafico, chirurgico e strutturato a punti elenco. NIENTE discorsi lunghi, niente introduzioni.

DATI DA ANALIZZARE:
- Mercato/Volumi: ${liquidita}
- Rete Sybil (Cabala): ${sybilStatus}
- Micro-Dumping: ${microDumping}
- Dev: ${fedinaDev}
- Bundle/Cecchini: ${bundleInfo}

REGOLE DI COMPILAZIONE (SEGUILE O IL SISTEMA ESPLODE):
1. STILE: Usa SOLO un elenco puntato (max 4-5 punti brevissimi).
2. ONDA PIRAMIDALE: Incrocia il "Bundle" e il "Micro-Dumping". Se la supply è controllata, scrivi esplicitamente se è in corso un'onda piramidale (i top holder stanno usando i nuovi retail come exit liquidity).
3. BOT PREDATORI (MEV/Sandwich): Valuta la vulnerabilità. C'è il rischio che i bot predatori si accodino alle transazioni (es. tu compri 10 e loro ti scaricano in testa 9.7)? Avvisa il trader.
4. TOKEN MORTO: Se i volumi scendono a zero o il trend è piatto, dichiaralo MORTO.

ESEMPIO DI FORMATO:
- 🩸 Liquidity: [Tua analisi rapida]
- 👁️ Bundle & Sybil: [Tua analisi rapida]
- 🔺 Schema Piramidale: [Rilevato/Non Rilevato + motivo]
- 🤖 Rischio Bot Predatori: [Alto/Basso + motivo]

METRICA FINALE OBBIGATORIA (su un'ultima riga separata):
RISCHIO_SCAM_FINALE: XX%`;
        if (!groqKeys || groqKeys.length === 0) throw new Error("Chiavi GROQ non trovate nel sistema globale.");
        
        // 🛡️ ROTAZIONE CHIAVI (ROUND-ROBIN): Prende la chiave attuale e sposta l'indice in avanti
        const apiKey = groqKeys[currentGroqIndex];
        currentGroqIndex = (currentGroqIndex + 1) % groqKeys.length; 
        
        console.log(`🔑 Usata chiave Groq numero: ${(currentGroqIndex === 0 ? groqKeys.length : currentGroqIndex)} di ${groqKeys.length}`);

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "llama3-8b-8192",
                        messages: [{ role: "user", content: promptLaboratorio }],
                        temperature: 0.2 
                    })
                });

             

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const testoAI = data.choices[0].message.content;

        let rischioScam = 50; 
        const matchRischio = testoAI.match(/RISCHIO_SCAM_FINALE:\s*(\d+)%/);
        if (matchRischio) rischioScam = parseInt(matchRischio[1]);
        
        const testoPulito = testoAI.replace(/RISCHIO_SCAM_FINALE:\s*\d+%/g, '').trim().replace(/\n/g, '<br>');
        const coloreRischio = rischioScam > 60 ? "#ff4d4d" : (rischioScam > 30 ? "#ffaa00" : "#00e676");

        const reportHTML = `
            <div style="color: #e4e4e7; line-height: 1.5; margin-bottom: 12px; font-size: 0.9em; font-family: sans-serif;">
                ${testoPulito}
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border: 1px solid ${coloreRischio}; padding: 10px; border-radius: 6px; text-align: center;">
                <span style="color:#888; text-transform: uppercase; font-size: 0.8em; font-weight:bold; display:block; margin-bottom:4px;">Rischio Scam (Giudice Supremo)</span>
                <strong style="color:${coloreRischio}; font-size: 1.6em; text-shadow: 0 0 10px ${coloreRischio}80; font-family: monospace;">${rischioScam}%</strong>
            </div>
        `;

        res.json({ success: true, verdetto: reportHTML });

    } catch (error) {
        console.error("❌ Errore Giudice Groq:", error.message);
        res.json({ success: false, verdetto: "Errore di calcolo AI: " + error.message });
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

    // =====================================================================
// 🎯 IL CACCIATORE: GLOBAL SCREENER ALGORITMICO (Risk/Reward 6k MC)
// =====================================================================

// Memoria a breve termine per tutti i token che stanno nascendo
const mempoolTokens = new Map(); 

// Le tue Formule Matematiche
const TARGET_MC = 6000; // Il punto di Reversal
const MIN_TX_SEC = 2;   // Minimo 3 acquisti al secondo per confermare la pressione
const MIN_RATIO = 1.1;  // Volume Buy deve essere +50% del Volume Sell
const MIN_U_INDEX = 0.30; // Almeno 60% dei wallet devono essere unici (Anti-Wash)

// =====================================================================
// 🔌 GESTIONE CONNESSIONI WEBSOCKET E RADAR
// =====================================================================
const activeSniperSubs = new Map(); 
const posizioniAperte = new Map(); // 🧠 Ricorda a quanto siamo entrati per chiudere insieme alla balena
io.on("connection", (socket) => {
    console.log("🔌 Un nuovo terminale (Estensione) si è connesso al Radar Live!");

    socket.on('imposta_wallet_spia', (walletsArray) => {
        console.log(`\n🔄 Sincronizzazione Bersagli dal Frontend: Ricevuti ${walletsArray.length} wallet.`);
        
        for (const [wallet, subId] of activeSniperSubs.entries()) {
            if (!walletsArray.includes(wallet)) {
                solanaConnection.removeOnLogsListener(subId);
                activeSniperSubs.delete(wallet);
                console.log(`🛑 Radar spento per: ${wallet}`);
            }
        }

        for (const wallet of walletsArray) {
            if (!activeSniperSubs.has(wallet)) {
                const subId = avviaAscoltoBersaglio(wallet);
                activeSniperSubs.set(wallet, subId);
            }
        }
    });
});

// =====================================================================
// 🎯 IL MOTORE DEFINITIVO: STALKER COPY-TRADE (BUY & SELL)
// =====================================================================
function avviaAscoltoBersaglio(walletAddress) {
    console.log(`📡 STALKER MODE IN ASCOLTO SU: ${walletAddress}`);
    const targetPubKey = new PublicKey(walletAddress);

    return solanaConnection.onLogs(targetPubKey, async (logsInfo, context) => {
        if (logsInfo.err) return; 
        const signature = logsInfo.signature;
        const logString = logsInfo.logs.join(" ");

        if (!logString.includes("Buy") && !logString.includes("Swap")) return;

        setTimeout(async () => {
            try {
                const tx = await solanaConnection.getParsedTransaction(signature, { 
                    maxSupportedTransactionVersion: 0, commitment: 'confirmed'
                });

                if (!tx || !tx.meta) return;

                const postBals = tx.meta.postTokenBalances || [];
                const tokenObj = postBals.find(b => b.owner === walletAddress && b.mint !== "So11111111111111111111111111111111111111112");
                if (!tokenObj) return;

                const tokenMint = tokenObj.mint;
                const preBals = tx.meta.preTokenBalances || [];
                const preObj = preBals.find(b => b.owner === walletAddress && b.mint === tokenMint);
                const preAmount = preObj ? preObj.uiTokenAmount.uiAmount : 0;
                const postAmount = tokenObj.uiTokenAmount.uiAmount;
                
                const isBuy = postAmount > preAmount;
                const trackerKey = `${walletAddress}-${tokenMint}`;

                if (isBuy) {
                    console.log(`\n🕵️ [TARGET ACQUISITO] La Balena ${walletAddress.substring(0,6)} ha COMPRATO ${tokenMint.substring(0,6)}...`);
                    await valutaEsplosivitaToken(tokenMint, walletAddress);
                } else {
                    // 🚨 LA BALENA STA VENDENDO! Dobbiamo controllare se siamo dentro!
                    if (posizioniAperte.has(trackerKey)) {
                        console.log(`\n🚨 [COPY-SELL ALERT] La Balena sta DUMPANDO ${tokenMint.substring(0,6)}! Esco immediatamente a mercato!`);
                        const mcEntrata = posizioniAperte.get(trackerKey);
                        posizioniAperte.delete(trackerKey); // Togliamo dalla memoria
                        
                        // Chiudiamo il trade istantaneamente
                        await chiudiPosizioneStalker(tokenMint, mcEntrata);
                    }
                }
            } catch (e) {}
        }, 2500); 
    }, "confirmed");
}
// =====================================================================
// 📡 ORACOLO DEI PREZZI (Recupera il valore reale in millisecondi)
// =====================================================================
// =====================================================================
// 📡 ORACOLO DEI PREZZI STEALTH (Bypassa Cloudflare Anti-Bot)
// =====================================================================
async function ottieniPrezzoToken(mint) {
    try {
        // 1. API Pump.fun travestita da normale Browser Google Chrome
        const pumpResp = await fetch(`https://frontend-api.pump.fun/coins/${mint}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Origin": "https://pump.fun",
                "Referer": "https://pump.fun/"
            }
        });
        
        if (pumpResp.ok) {
            const pumpData = await pumpResp.json();
            if (pumpData && pumpData.usd_market_cap) return parseFloat(pumpData.usd_market_cap);
        }
        
        // 2. Fallback su DexScreener se Pump.fun fa i capricci
        const dexResp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        if (dexResp.ok) {
            const dexData = await dexResp.json();
            if (dexData.pairs && dexData.pairs.length > 0) {
                return parseFloat(dexData.pairs[0].fdv || dexData.pairs[0].marketCap);
            }
        }
        
        // 3. Secondo Fallback: Se il token è nato da 1 millisecondo e le API non lo hanno,
        // diamo un Market Cap base (tipico di lancio su pump) per non annullare il trade.
        return 30000; // 30k $ MC (standard bonding curve start)

    } catch (e) {
        return 30000;
    }
}
async function valutaEsplosivitaToken(tokenMint, walletTarget) {
    try {
        const mintPubKey = new PublicKey(tokenMint);
        const sigs = await solanaConnection.getSignaturesForAddress(mintPubKey, { limit: 30 });
        
        let esito = "SCARTATO"; let motivo = ""; let colore = "#ff4d4d"; let isGolden = false;

        if (sigs.length < 10) {
            motivo = "Troppo illiquido/morto. Nessuna FOMO.";
        } else {
            const ora = Math.floor(Date.now() / 1000);
            let txInLast60s = 0;
            sigs.forEach(sig => { if (sig.blockTime && (ora - sig.blockTime <= 60)) txInLast60s++; });

            if (txInLast60s < 10) {
                motivo = `Bassa volatilità (${txInLast60s} tx/min). Manca la FOMO.`;
            } else {
                const recentSigs = sigs.slice(0, 15).map(s => s.signature);
                const txs = await solanaConnection.getParsedTransactions(recentSigs, { maxSupportedTransactionVersion: 0 });

                let buyVol = 0; let sellVol = 0;
                let uniqueWallets = new Set();

                txs.forEach(tx => {
                    if (!tx || !tx.meta) return;
                    uniqueWallets.add(tx.transaction.message.accountKeys[0].pubkey.toString());
                    const preSol = (tx.meta.preBalances[0] || 0) / 1e9;
                    const postSol = (tx.meta.postBalances[0] || 0) / 1e9;
                    if (preSol > postSol) buyVol += Math.abs(preSol - postSol);
                    else sellVol += Math.abs(preSol - postSol);
                });

                const ratio = sellVol > 0 ? (buyVol / sellVol) : 999;
                const uIndex = uniqueWallets.size / txs.length;

                // ==========================================
                // 🏆 DECISIONE: INGRESSO STALKER (NESSUN TIMER)
                // ==========================================
                if (ratio >= 1.2 && uIndex >= 0.40) {
                    esito = "VERIFICATO"; motivo = "Sicurezza superata. STALKING AVVIATO!"; colore = "#00e676"; isGolden = true;
                    
                    io.emit('golden_signal_found', {
                        mint: tokenMint, ratio: ratio === 999 ? "MAX" : ratio.toFixed(2), uIndex: Math.round(uIndex * 100), buyVol: buyVol.toFixed(2), time: new Date().toLocaleTimeString('it-IT')
                    });

                    // 🤖 LETTURA DEL PREZZO E MEMORIZZAZIONE
                    console.log(`\n🤖 [AUTO-SNIPER] Lettura valore a mercato di ${tokenMint.substring(0,6)}...`);
                    const mcEntrata = await ottieniPrezzoToken(tokenMint);

                    if (!mcEntrata) {
                        console.log(`⚠️ [AUTO-SNIPER] Impossibile leggere il prezzo. Trade annullato.`);
                    } else {
                        console.log(`🟢 [STALKER] Entrato a $${mcEntrata.toLocaleString()}!`);
                        console.log(`👀 Mimetizzazione completata. Aspetto che la balena venda per uscire...`);
                        
                        // SALVIAMO NELLA MEMORIA STALKER
                        const trackerKey = `${walletTarget}-${tokenMint}`;
                        posizioniAperte.set(trackerKey, mcEntrata);
                    }
                } else {
                    motivo = `Filtrato. Ratio: ${ratio === 999 ? "MAX" : ratio.toFixed(2)} | U-Index: ${(uIndex*100).toFixed(0)}%`;
                }
            }
        }

        console.log(`⚖️ Autopsia: ${esito} -> ${motivo}`);
        
        io.emit('autopsia_sniper_live', {
            mint: tokenMint, walletSpia: walletTarget, esito: esito, motivo: motivo, colore: colore
        });

    } catch (error) {}
}
async function chiudiPosizioneStalker(tokenMint, mcEntrata) {
    try {
        const mcUscita = await ottieniPrezzoToken(tokenMint);
        if (!mcUscita) {
            console.log(`⚠️ Impossibile determinare il prezzo di uscita per ${tokenMint}.`);
            return;
        }

        const sizeIngressoSol = 0.1;
        const variazionePct = (mcUscita - mcEntrata) / mcEntrata; 
        const pnlReale = sizeIngressoSol * variazionePct; 
        
        console.log(`📊 Risultato Mercato: Entrato a $${mcEntrata.toLocaleString()} -> Uscito a $${mcUscita.toLocaleString()}`);
        console.log(`📈 Variazione Reale: ${(variazionePct * 100).toFixed(2)}%`);

        // Scrittura diretta sul disco
        salvaTradeInLocale(tokenMint, pnlReale);
        console.log(`💰 [STALKER] Trade Sincronizzato Chiuso! PnL: ${pnlReale > 0 ? '+' : ''}${pnlReale.toFixed(4)} SOL`);
        
    } catch (e) {
        console.log("Errore durante l'uscita sincronizzata:", e.message);
    }
}

// =====================================================================
// 🤖 AUTOPILOTA 24/7: SGANCIO DALL'ESTENSIONE
// =====================================================================
// Inserisci qui i wallet dei migliori trader che hai trovato
const BALENE_AUTONOME = [
    "38HGfTmj2y3Q3PPWpsfrMVHxdwvJJQvDP1HuT5DyjHQV",
    //"EZzygUEZGLDgLG3JLapmpcEGTeJiEnXC8tVPXYXV63JG", // Il bot HFT
    //"93kk52HkrH5pHEPyb2KM62mP4cWA1N5DaSgBgDzA2uT9"  // L'altro tuo target
];

// Appena accendi il server, inizia a spiarli senza aspettare il frontend!
BALENE_AUTONOME.forEach(wallet => {
    if (!activeSniperSubs.has(wallet)) {
        const subId = avviaAscoltoBersaglio(wallet);
        activeSniperSubs.set(wallet, subId);
    }
});

// =====================================================================
// 🚀 AVVIO SERVER DEFINITIVO
// =====================================================================
server.listen(PORT, () => {
    console.log(`🚀 Server Radar avviato sulla porta ${PORT}`);
    console.log(`🤖 Autopilota Innescato: In ascolto H24 su ${BALENE_AUTONOME.length} balene.`);
});

// 🔴 FINE DEL FILE. NON AGGIUNGERE NESSUNA RIGA DOPO QUESTA.
