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
const TARGET_PROFITTO_NETTO = 0.15; // 🎯 ABBASSATO! Scappiamo con i soldi appena vediamo 15 centesimi!
const STOP_LOSS_NETTO = -0.10;  

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

// 🧠 QUANDO LA BALENA COMPRA, NOI COMPRIAMO
socket.on('golden_signal_found', async (segnale) => {
    if (tradeAttivi.has(segnale.mint)) return;
    tradeAttivi.add(segnale.mint); 
    
    console.log(`\n\n🎯 [COPY-BUY TRIGGER] La balena ha colpito! Token: ${segnale.mint}`);
    
    // 🧠 ATTIVAZIONE SCUDO AI ISTANTANEO
    const isClean = await scudoGroqFlash(segnale.mint);
    if (!isClean) {
        console.log(`⛔ [BLOCCO GROQ] Il contratto non ha superato l'ispezione AI. Trade annullato.`);
        tradeAttivi.delete(segnale.mint); // Sblocco il lucchetto per le prossime
        return;
    }

    avviaStalkerCopia(segnale.mint, 2.0); 
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
            return;
        }

        // SPARIAMO SUBITO ALLA CIECA
        // SPARIAMO SUBITO ALLA CIECA
        // SPARIAMO SUBITO ALLA CIECA
        sparaAcquistoReale(tokenMint, investimentoUSD);

        let quantitaTokenAcquistati = 0;
        let tradeFallitoSuSolana = false; 

        // 🚨 RICERCA OSTINATA DEI TOKEN (Polling Anti-Ritardo RPC)
        const cercaToken = async () => {
            const mintPubKey = new web3.PublicKey(tokenMint);
            const ata = await getAssociatedTokenAddress(mintPubKey, portafoglio.publicKey);
            
            for (let i = 1; i <= 12; i++) {
                try {
                    const bal = await connection.getTokenAccountBalance(ata);
                    if (bal.value.uiAmount > 0) {
                        quantitaTokenAcquistati = bal.value.uiAmount;
                        console.log(`\n📦 [INVENTARIO VERO] Ottenuti esattamente ${quantitaTokenAcquistati} token netti (Trovati al tentativo ${i}).`);
                        return; // Token trovati, usciamo dalla ricerca!
                    }
                } catch(e) {
                    // Il nodo RPC è in ritardo. Restiamo in silenzio e riproviamo.
                }
                // Aspetta 1 secondo esatto prima di ritentare
                await new Promise(resolve => setTimeout(resolve, 1000)); 
            }
            
            // Se dopo 12 secondi (12 tentativi) non c'è traccia dei token, allora è fallito davvero
            tradeFallitoSuSolana = true;
            console.log(`\n⚠️ [ERRORE LETTURA] Nessun token ricevuto dopo 12s. Annullamento trade...`);
            tradeAttivi.delete(tokenMint); 
            if (typeof subscriptionId !== 'undefined') connection.removeAccountChangeListener(subscriptionId);
        };
        
        cercaToken(); // Spara la ricerca in background

        const subscriptionId = connection.onAccountChange(
            cassaPDA,
            (accountInfo, context) => {
                // 🛑 Se il trade è fallito, interrompiamo immediatamente ogni calcolo
                if (tradeFallitoSuSolana) return; 

                // Se l'ispezione non è finita, aspettiamo
                if (quantitaTokenAcquistati === 0) {
                    process.stdout.write(`\r⏳ Calcolo slippage e attesa token reali in wallet...   `);
                    return;
                }

                const data = accountInfo.data;
                if (data.length < 49) return;

                const virtualTokenReserves = Number(data.readBigUInt64LE(8));
                const virtualSolReserves = Number(data.readBigUInt64LE(16));
                const prezzoInSol = (virtualSolReserves / 1e9) / (virtualTokenReserves / 1e6);
                const prezzoAttualeUsd = prezzoInSol * PREZZO_SOL_USD;

                // 🧮 MATEMATICA REALE
                let valoreLordo = quantitaTokenAcquistati * prezzoAttualeUsd;
                let feeUscita = valoreLordo * FEE_DEX_PERCENTUALE;
                let pnlNetto = (valoreLordo - investimentoUSD) - FEE_DI_RETE_TOTALE - feeUscita;

                process.stdout.write(`\r📈 [COPY TRADE] Valore Reale: $${valoreLordo.toFixed(3)} | NETTO: $${pnlNetto.toFixed(3)}   `);

                if (pnlNetto >= TARGET_PROFITTO_NETTO) {
                    connection.removeAccountChangeListener(subscriptionId);
                    console.log(`\n\n🎯 [BERSAGLIO COLPITO] Profitto Reale! Vendo e chiudo!`);
                    sparaVenditaReale(tokenMint);
                    salvaPaperTrading(tokenMint, pnlNetto, "✅ WIN");
                }

                if (pnlNetto <= STOP_LOSS_NETTO) {
                    connection.removeAccountChangeListener(subscriptionId);
                    console.log(`\n\n⚠️ [PARACADUTE] Stop Loss Reale. Fuga d'emergenza!`);
                    sparaVenditaReale(tokenMint);
                    salvaPaperTrading(tokenMint, pnlNetto, "❌ LOSS");
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
                "slippage": 7,              
                "priorityFee": 0.0003,      
                "pool": "pump"
            })
        });

        if (response.status !== 200) return;

        const data = await response.arrayBuffer();
        const transazioneV0 = VersionedTransaction.deserialize(new Uint8Array(data));
        transazioneV0.sign([portafoglio]);
        
        const signature = await connection.sendTransaction(transazioneV0, { skipPreflight: true, maxRetries: 2 });
        console.log(`🔥 [COPIA-ACQUISTO] 👉 https://solscan.io/tx/${signature}`);
    } catch (error) {}
}
// ==========================================
// 🔥 AUTO-INCENERITORE (RECUPERO AFFITTO)
// ==========================================
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
async function scudoGroqFlash(tokenMint) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return true; // Bypass se manca la chiave nel .env
    
    try {
        const start = Date.now();
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ 
                    role: "system", 
                    content: `Sei un filtro HFT. Un trader istituzionale sta per copiare un acquisto sul contratto: ${tokenMint}. Se riconosci pattern malevoli, dev seriali o stringhe sospette, rispondi ESATTAMENTE e SOLO con 'SCAM'. Altrimenti rispondi 'CLEAN'. Nessuna punteggiatura aggiuntiva.` 
                }],
                max_tokens: 3, // Cruciale: limita l'output per essere un proiettile
                temperature: 0.1
            })
        });
        
        const data = await response.json();
        const ms = Date.now() - start;
        const verdetto = data.choices[0].message.content.trim().toUpperCase();
        
        console.log(`⚡ [GROQ FLASH] Analisi neurale in ${ms}ms: ${verdetto}`);
        return verdetto.includes("CLEAN");
    } catch (error) {
        return true; // Se l'API lagga, non bloccare il trade e prosegui
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
                "slippage": 7,              
                "priorityFee": 0.0003,      
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
        autoInceneritore(tokenMint);
    } catch (error) {}
}