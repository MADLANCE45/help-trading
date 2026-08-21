const { VersionedTransaction } = require('@solana/web3.js');
require('dotenv').config();
const readline = require('readline');
const fs = require('fs');
const web3 = require('@solana/web3.js');
const bs58 = require('bs58');
const { io } = require("socket.io-client"); 
const { getAssociatedTokenAddress, createCloseAccountInstruction, createBurnInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
// ==========================================
// 🔌 CONNESSIONE HELIUS E BLOCKCHAIN
// ==========================================
const HELIUS_API = process.env.HELIUS_API_KEY;
if (!HELIUS_API) {
    console.error("❌ ERRORE: HELIUS_API_KEY non trovata nel .env!");
    process.exit(1);
}
const connection = new web3.Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API}`, {
    wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API}`,
    commitment: 'confirmed'
});

// ==========================================
// 🔫 ARMAMENTO DEL CECCHINO (WALLET)
// ==========================================
if (!process.env.PRIVATE_KEY) {
    console.error("❌ ERRORE: PRIVATE_KEY non trovata nel .env!");
    process.exit(1);
}
const secretKey = bs58.decode(process.env.PRIVATE_KEY);
const portafoglio = web3.Keypair.fromSecretKey(secretKey);

console.log(`\n🎯 Cecchino armato. Indirizzo Operativo: ${portafoglio.publicKey.toBase58()}`);

const PUMP_FUN_PROGRAM_ID = new web3.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PREZZO_SOL_USD = 150; 
const FILE_PAPER = './paper_trading.json';

const FEE_DI_RETE_TOTALE = 0.03;    
const FEE_DEX_PERCENTUALE = 0.01;
const TARGET_PROFITTO_NETTO = 0.45;
const STOP_LOSS_NETTO = -1.50;   // ⚠️ Tagliamo subito se il trend è sbagliato

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ==========================================
// 🌐 CONNESSIONE AL SERVER LOCALE (INDEX.JS)
// ==========================================
const SERVER_URL = "http://localhost:3000"; 
const socket = io(SERVER_URL, {
    transports: ['websocket']
});

socket.on("connect", () => {
    console.log(`\n🟢 [COPY-TRADER] Connesso al Radar di Spionaggio Balene (Porta 3000)`);
    avviaConfigurazioneBalene();
});

socket.on("connect_error", (err) => {
    console.log(`⚠️ [ATTENZIONE] Impossibile connettersi al server locale (${SERVER_URL}). Assicurati di aver avviato 'node index.js' in un altro terminale!`);
});

function avviaConfigurazioneBalene() {
    console.log("\n-------------------------------------------------------");
    rl.question("🐋 Inserisci l'indirizzo del wallet da COPIARE (o premi invio per usare le balene di default): ", (risposta) => {
        let targetWallet = risposta.trim();
        
        // Metti qui i wallet che vuoi copiare di default
        let listaBalene = [
            "38HGfTmj2y3Q3PPWpsfrMVHxdwvJJQvDP1HuT5DyjHQV" 
        ];

        if (targetWallet.length >= 32 && targetWallet.length <= 44) {
            listaBalene = [targetWallet];
            console.log(`🎯 Nuovo bersaglio acquisito in copia: ${targetWallet}`);
        } else {
            console.log(`🤖 Uso la flotta di balene autonome pre-caricate nel sistema.`);
        }

        socket.emit('imposta_wallet_spia', listaBalene);
        console.log(`📡 Stalker attivo! In attesa che la balena compri un token...`);
    });
}

// 🧠 QUANDO LA BALENA COMPRA, NOI COMPRIAMO
// 🔒 LUCCHETTO: Memoria dei trade attivi per non comprare doppi!
const tradeAttivi = new Set();
let occupatoInTrade = false;
// 🧠 QUANDO LA BALENA COMPRA, NOI COMPRIAMO
// 🧠 QUANDO LA BALENA COMPRA, NOI COMPRIAMO
socket.on('golden_signal_found', async (segnale) => {
    if (tradeAttivi.has(segnale.mint)) return;
    
    if (occupatoInTrade) {
        console.log(`⚠️ Skip: Balena mitragliatrice ignorata. Sono già in trade.`);
        return;
    }

    tradeAttivi.add(segnale.mint); 
    occupatoInTrade = true; // 🔴 Semaforo rosso
    
    console.log(`\n\n🎯 [COPY-BUY TRIGGER] La balena ha colpito! Token: ${segnale.mint}`);
    
    // Niente più Groq qui! Passiamo subito alla funzione principale
    avviaStalkerCopia(segnale.mint, 8.0);
});

async function avviaStalkerCopia(tokenMint, investimentoUSD) {
    try {
        const cassaPDA = getBondingCurvePDA(new web3.PublicKey(tokenMint));
        console.log(`\n🟢 [COPY-EXECUTION] Entrata automatica su: ${tokenMint.substring(0,8)}...`);
        
        const accountIniziale = await connection.getAccountInfo(cassaPDA, 'confirmed');
        if (!accountIniziale || accountIniziale.data.length < 49) {
            console.log(`⚠️ Skip: Cassa non valida o token già migrato.`);
            return;
        }

        const isMigrato = accountIniziale.data.readUInt8(48) === 1;
        if (isMigrato) {
            console.log(`⚠️ Skip: Token migrato su Raydium.`);
            tradeAttivi.delete(tokenMint);
            return;
        }

        // 🧮 CALCOLO MARKET CAP PREVENTIVO
        const vTokenRaw = accountIniziale.data.readBigUInt64LE(8).toString();
        const vSolRaw = accountIniziale.data.readBigUInt64LE(16).toString();
        const vToken = Number(vTokenRaw) / 1000000;
        const vSol = Number(vSolRaw) / 1000000000;
        
        const prezzoInSol = vSol / vToken;
        const prezzoAttualeUsd = prezzoInSol * PREZZO_SOL_USD;
        
        // Su Pump.fun la supply totale è sempre 1 Miliardo di token
        const marketCapUsd = prezzoAttualeUsd * 1000000000; 
        console.log(`📊 Analisi pre-acquisto... Market Cap stimato: $${marketCapUsd.toFixed(0)}`);

        // 🧠 INTERROGAZIONE DEL GIUDICE SUPREMO
        const giudizio = await scudoGroqFlash(tokenMint, marketCapUsd);
        
        if (!giudizio.isClean) {
            console.log(`⛔ [BLOCCO GIUDICE] Trade annullato.`);
            tradeAttivi.delete(tokenMint);
            occupatoInTrade = false; // 🟢 Semaforo Verde
            return;
        }

        // Se Groq dà il via libera, spariamo!
        // 🚀 SPARIAMO E ATTENDIAMO LA FIRMA
        const firmaAcquisto = await sparaAcquistoReale(tokenMint, investimentoUSD);
        
        if (!firmaAcquisto) {
            console.log(`⚠️ [ERRORE API] Impossibile inviare la transazione. Trade annullato.`);
            tradeAttivi.delete(tokenMint); 
            return;
        }

        let quantitaTokenAcquistati = 0;
        let tradeFallitoSuSolana = false; 

        let profittoMassimoRaggiunto = -999;
        let inFaseDiPompaggio = false;
        const TOLLERANZA_CROLLO = 0.25; 

        // 🚨 RICERCA OSTINATA DEI TOKEN (60 Secondi di pazienza)
        // 🚨 RICERCA OSTINATA DEI TOKEN (Versione con Radar Avanzato)
        // 🚨 RICERCA OSTINATA DEI TOKEN (Versione FAST-FAIL: 18 Secondi)
        const cercaToken = async () => {
            const mintPubKey = new web3.PublicKey(tokenMint);
            process.stdout.write(`\n⏳ Attesa nodo RPC per conferma token in cassa (Max 18s)...\n`);
            
            // 🔥 Abbassato a 6 tentativi (circa 18 secondi totali)
            for (let i = 1; i <= 6; i++) {
                try {
                    const accounts = await connection.getParsedTokenAccountsByOwner(portafoglio.publicKey, { mint: mintPubKey });
                    
                    if (accounts.value.length > 0) {
                        const amount = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
                        if (amount > 0) {
                            quantitaTokenAcquistati = amount;
                            console.log(`\n📦 [INVENTARIO VERO] Ottenuti esattamente ${quantitaTokenAcquistati} token netti (Tentativo ${i}).`);
                            return; 
                        }
                    }
                } catch(e) {
                    console.log(`\n⚠️ [DEBUG NODO RPC] Errore di lettura: ${e.message}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 3000)); 
            }
            
            // Se fallisce in 18 secondi, la diamo per morta e ci sblocchiamo subito
            tradeFallitoSuSolana = true;
            occupatoInTrade = false; // 🟢 SEMAFORO VERDE IMMEDIATO
            
            console.log(`\n⚠️ [TRANSAZIONE DROPPATA] Nessun token in 18s. La rete ha cestinato l'ordine. Semaforo sbloccato.`);
            if (typeof subscriptionId !== 'undefined') connection.removeAccountChangeListener(subscriptionId);
        };
        
        cercaToken(); // Avvia la ricerca in background

        const subscriptionId = connection.onAccountChange(
            cassaPDA,
            (accountInfo, context) => {
                // Se il trade è fallito, interrompiamo immediatamente ogni calcolo
                if (tradeFallitoSuSolana) return; 
                if (quantitaTokenAcquistati === 0) return;

                const data = accountInfo.data;
                if (data.length < 49) return;

                // 🧮 FIX MATEMATICO ASSOLUTO: Stringify per proteggerci dal bug di Node.js
                const vTokenRaw = data.readBigUInt64LE(8).toString();
                const vSolRaw = data.readBigUInt64LE(16).toString();
                
                // Divisione sicura per i decimali corretti
                const vToken = Number(vTokenRaw) / 1000000;      // 1e6 decimali per i token Pump
                const vSol = Number(vSolRaw) / 1000000000;       // 1e9 decimali per i SOL

                const prezzoInSol = vSol / vToken;
                const prezzoAttualeUsd = prezzoInSol * PREZZO_SOL_USD;

                // 🧮 CALCOLO DEL PROFITTO REALE
                let valoreLordo = quantitaTokenAcquistati * prezzoAttualeUsd;
                let feeUscita = valoreLordo * FEE_DEX_PERCENTUALE;
                let pnlNetto = (valoreLordo - investimentoUSD) - FEE_DI_RETE_TOTALE - feeUscita;

                process.stdout.write(`\r📈 [COPY TRADE] Valore Reale: $${valoreLordo.toFixed(3)} | NETTO: $${pnlNetto.toFixed(3)}   `);

               if (pnlNetto >= TARGET_PROFITTO_NETTO) {
                    if (!inFaseDiPompaggio) {
                        console.log(`\n\n🚀 [TARGET RAGGIUNTO] La candela è verde! Attivo il Trailing Stop e lo lascio correre...`);
                        inFaseDiPompaggio = true;
                        profittoMassimoRaggiunto = pnlNetto;
                    } else {
                        // Se continua a salire, aggiorniamo il nostro record
                        if (pnlNetto > profittoMassimoRaggiunto) {
                            profittoMassimoRaggiunto = pnlNetto;
                        }
                        
                        // ⚠️ IL GROSSO SELL: Se il prezzo crolla dal picco massimo, tagliamo e incassiamo!
                        if (pnlNetto <= profittoMassimoRaggiunto - TOLLERANZA_CROLLO) {
                            connection.removeAccountChangeListener(subscriptionId);
                            console.log(`\n\n⚠️ [GROSSO SELL RILEVATO] Il prezzo sta scendendo dal picco. Vendo e blocco i profitti!`);
                            sparaVenditaReale(tokenMint);
                            salvaPaperTrading(tokenMint, pnlNetto, "✅ WIN (TRAILING)");
                            occupatoInTrade = false; // 🟢 SBLOCCO
                        }
                    }
                }

                // Paracadute di emergenza (Stop Loss Classico)
                if (pnlNetto <= STOP_LOSS_NETTO && !inFaseDiPompaggio) {
                    connection.removeAccountChangeListener(subscriptionId);
                    console.log(`\n\n⚠️ [PARACADUTE] Stop Loss Reale. Fuga d'emergenza!`);
                    sparaVenditaReale(tokenMint);
                    salvaPaperTrading(tokenMint, pnlNetto, "❌ LOSS");
                    occupatoInTrade = false; // 🟢 SBLOCCO
                }
            },
            'processed'
        );
    } catch (error) {
        console.log(`\n❌ Errore Copy-Trade: ${error.message}`);
    }
}

function getBondingCurvePDA(mintPubkey) {
    const [pda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("bonding-curve"), mintPubkey.toBuffer()],
        PUMP_FUN_PROGRAM_ID
    );
    return pda;
}

function salvaPaperTrading(tokenMint, pnlNetto, esito) {
    let paperData = { trades: [], bilancio: 0 };
    if (fs.existsSync(FILE_PAPER)) {
        paperData = JSON.parse(fs.readFileSync(FILE_PAPER, 'utf8'));
    }
    paperData.trades.push({ data: new Date().toLocaleString('it-IT'), mint: tokenMint, pnl_netto_usd: parseFloat(pnlNetto.toFixed(4)), esito: esito });
    paperData.bilancio += parseFloat(pnlNetto);
    fs.writeFileSync(FILE_PAPER, JSON.stringify(paperData, null, 2));
}

async function sparaAcquistoReale(tokenMint, investimentoUSD) {
    const investimentoSOL = parseFloat((investimentoUSD / PREZZO_SOL_USD).toFixed(5));
    try {
        const response = await fetch("https://pumpportal.fun/api/trade-local", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                "publicKey": portafoglio.publicKey.toBase58(),
                "action": "buy",
                "mint": tokenMint,
                "denominatedInSol": "true",
                "amount": investimentoSOL,
                "slippage": 15,              
                "priorityFee": 0.002,   
                "pool": "pump"
            })
        });

        if (response.status !== 200) return null; // Restituisce null se fallisce l'API

        const data = await response.arrayBuffer();
        const transazioneV0 = VersionedTransaction.deserialize(new Uint8Array(data));
        transazioneV0.sign([portafoglio]);
        
        const signature = await connection.sendTransaction(transazioneV0, { skipPreflight: true, maxRetries: 2 });
        console.log(`🔥 [COPIA-ACQUISTO] 👉 https://solscan.io/tx/${signature}`);
        return signature; // 👈 RESTITUISCE LA FIRMA AL BOT
    } catch (error) {
        return null;
    }
}
// ==========================================
// 🔥 AUTO-INCENERITORE 2.0 (BURN & CLOSE)
// ==========================================
async function autoInceneritore(tokenMint) {
    console.log(`\n🧹 [INCENERITORE 2.0] Attesa di 15s per l'assestamento della blockchain...`);
    
    setTimeout(async () => {
        try {
            const mintPubKey = new web3.PublicKey(tokenMint);
            const ata = await getAssociatedTokenAddress(mintPubKey, portafoglio.publicKey);
            
            // 1. Controlliamo se la cassa esiste e quanta "polvere" c'è dentro
            const accountInfo = await connection.getTokenAccountBalance(ata);
            const amountRaw = accountInfo.value.amount; // Ammontare grezzo in stringa
            
            const tx = new web3.Transaction();

            // 2. Se c'è polvere (rimasugli), aggiungiamo l'istruzione per BRUCIARLA
            if (amountRaw !== "0") {
                console.log(`🔥 [BURN] Trovata polvere da svuotare (${accountInfo.value.uiAmount} token). Polverizzazione in corso...`);
                tx.add(
                    createBurnInstruction(
                        ata,
                        mintPubKey,
                        portafoglio.publicKey,
                        BigInt(amountRaw), // Usiamo BigInt per sicurezza sui decimali enormi di Solana
                        [],
                        TOKEN_PROGRAM_ID
                    )
                );
            }

            // 3. Aggiungiamo l'istruzione per CHIUDERE la cassa ormai a zero e riprendere i SOL
            tx.add(
                createCloseAccountInstruction(ata, portafoglio.publicKey, portafoglio.publicKey, [], TOKEN_PROGRAM_ID)
            );
            
            // 4. Spara l'esecuzione combinata
            const signature = await connection.sendTransaction(tx, [portafoglio], { skipPreflight: true });
            console.log(`\n💰 [AFFITTO RECUPERATO] Cassa distrutta con successo! +0.002 SOL nel wallet. 👉 https://solscan.io/tx/${signature}`);

        } catch (error) {
            console.log(`\n⚠️ [INCENERITORE FALLITO] Non ho potuto bruciare la cassa. Motivo: ${error.message}`);
        }
    }, 15000); // Alzato a 15 secondi per assicurarci che la vendita precedente sia confermata al 100%

}
// ==========================================
// ⚡ GROQ FLASH: PREDATORE DI SCAM ISTANTANEO
// ==========================================
// ==========================================
// ⚡ GROQ FLASH: IL GIUDICE SUPREMO
// ==========================================
async function scudoGroqFlash(tokenMint, marketCap) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return { isClean: true, motivazione: "Bypass (API Key mancante)" }; 
    
    try {
        const start = Date.now();
        const prompt = `Sei l'algoritmo giudice HFT di un trader istituzionale. Una balena sta comprando il token ${tokenMint}. 
        Il Market Cap attuale stimato è $${marketCap.toFixed(0)}. 
        Regole:
        1. Se il Market Cap è sotto i 4000$, è un token appena nato: rischio accettabile.
        2. Se il Market Cap supera i 10000$ subito dopo la creazione, la balena è entrata tardi o il prezzo è già esploso: rischio altissimo.
        Rispondi ESATTAMENTE in questo formato JSON e nient'altro: {"verdetto": "CLEAN" oppure "SCAM", "motivazione": "la tua spiegazione breve in italiano"}`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: prompt }],
                max_tokens: 50, 
                temperature: 0.1
            })
        });
        
        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        const ms = Date.now() - start;
        
        // Estrai il JSON dalla risposta dell'LLM
        const jsonMatch = content.match(/\{.*\}/s);
        const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { verdetto: "CLEAN", motivazione: "Errore parsing JSON" };

        console.log(`\n⚖️ [VERDETTO GROQ] (${ms}ms) -> ${result.verdetto}`);
        console.log(`🗣️ Motivazione: ${result.motivazione}`);

        return { isClean: result.verdetto === "CLEAN", motivazione: result.motivazione };
    } catch (error) {
        return { isClean: true, motivazione: "Errore di connessione API Groq" }; 
    }
}
async function sparaVenditaReale(tokenMint) {
    try {
        const response = await fetch("https://pumpportal.fun/api/trade-local", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                "publicKey": portafoglio.publicKey.toBase58(),
                "action": "sell",
                "mint": tokenMint,
                "denominatedInSol": "false",
                "amount": "100%",
                "slippage": 15,              
                "priorityFee": 0.002,      
                "pool": "pump"
            })
        });

        if (response.status !== 200) return;

        const data = await response.arrayBuffer();
        const transazioneV0 = VersionedTransaction.deserialize(new Uint8Array(data));
        transazioneV0.sign([portafoglio]);
        
        const signature = await connection.sendTransaction(transazioneV0, { skipPreflight: true, maxRetries: 2 });
        console.log(`🔥 [COPIA-VENDITA] 👉 https://solscan.io/tx/${signature}`);
        
        // 🧹 AZIONA L'INCENERITORE!
        //autoInceneritore(tokenMint);
    } catch (error) {}
}