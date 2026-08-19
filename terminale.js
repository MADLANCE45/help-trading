const { VersionedTransaction } = require('@solana/web3.js');
require('dotenv').config();
const readline = require('readline');
const fs = require('fs');
const web3 = require('@solana/web3.js');

// Connessione Helius
const HELIUS_API = process.env.HELIUS_API_KEY;
if (!HELIUS_API) {
    console.error("❌ ERRORE: HELIUS_API_KEY non trovata nel .env!");
    process.exit(1);
}
const connection = new web3.Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API}`, {
    wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API}`,
    commitment: 'confirmed'
});
const bs58 = require('bs58');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');

// ==========================================
// 🔫 ARMAMENTO DEL CECCHINO (WALLET)
// ==========================================
if (!process.env.PRIVATE_KEY) {
    console.error("❌ ERRORE: PRIVATE_KEY non trovata nel .env!");
    process.exit(1);
}
// Decodifichiamo la tua chiave segreta
const secretKey = bs58.decode(process.env.PRIVATE_KEY);
const portafoglio = web3.Keypair.fromSecretKey(secretKey);

console.log(`\n🎯 Cecchino armato. Indirizzo Operativo: ${portafoglio.publicKey.toBase58()}`);
// IL VERO PROGRAM ID DI PUMP.FUN (Corretto!)
const PUMP_FUN_PROGRAM_ID = new web3.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PREZZO_SOL_USD = 150; 
const FILE_PAPER = './paper_trading.json';

// --- LA NUOVA MATEMATICA LOW-FEE ---
const FEE_DI_RETE_TOTALE = 0.01; 
const FEE_DEX_PERCENTUALE = 0.01; 
const TARGET_PROFITTO_NETTO = 0.10; 
const STOP_LOSS_NETTO = -0.30; 

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.clear();
console.log("\n=======================================================");
console.log(" 🦅 [RADAR-QUANT] MODALITÀ AVVOLTOIO (LOW-FEE) 🦅");
console.log("=======================================================\n");

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

async function avviaStalkerReale(tokenMint, investimentoUSD) {
    try {
        const cassaPDA = getBondingCurvePDA(new web3.PublicKey(tokenMint));
        console.log(`\n🟢 [EXECUTION] Token: ${tokenMint.substring(0,8)}...`);
        
        const accountIniziale = await connection.getAccountInfo(cassaPDA, 'confirmed');
        
        if (!accountIniziale) {
            console.log(`\n⚠️ SCARTATO: Cassa inesistente. Il token è un Fake, oppure è già migrato su Raydium!`);
            return chiediAzione();
        }

        if (accountIniziale.data.length < 49) {
            console.log(`\n⚠️ ERRORE: Dati corrotti. Non è una Bonding Curve di Pump.fun.`);
            return chiediAzione();
        }

        // Interruttore Raydium al Byte 48
        const isMigrato = accountIniziale.data.readUInt8(48) === 1;
        if (isMigrato) {
            console.log(`\n⚠️ SCARTATO: Il token ha superato i 69k MC ed è migrato su Raydium!`);
            return chiediAzione();
        }

        console.log(`✅ [CONFERMATO] Cassa attiva! Inizio Fase 1: OSSERVAZIONE DEL FONDO...\n`);

        let stato = 'OSSERVAZIONE'; 
        let minimoLocale = Infinity;
        let prezzoAcquistoUsd = 0;
        let quantitaTokenAcquistati = 0;

        const subscriptionId = connection.onAccountChange(
            cassaPDA,
            (accountInfo, context) => {
                const data = accountInfo.data;
                if (data.length < 49) return;

                const virtualTokenReserves = Number(data.readBigUInt64LE(8));
                const virtualSolReserves = Number(data.readBigUInt64LE(16));
                const prezzoInSol = (virtualSolReserves / 1e9) / (virtualTokenReserves / 1e6);
                const prezzoAttualeUsd = prezzoInSol * PREZZO_SOL_USD;

                if (stato === 'OSSERVAZIONE') {
                    if (prezzoAttualeUsd < minimoLocale) {
                        minimoLocale = prezzoAttualeUsd;
                    }

                    const rimbalzoPerc = ((prezzoAttualeUsd - minimoLocale) / minimoLocale) * 100;
                    
                    process.stdout.write(`\r🦅 [IN ATTESA] Minimo: $${minimoLocale.toFixed(6)} | Prezzo: $${prezzoAttualeUsd.toFixed(6)} | Rimbalzo: +${rimbalzoPerc.toFixed(2)}%   `);

                    // TRIGGER: +2% organico dal fondo
                    if (rimbalzoPerc >= 2.0) {
                        stato = 'IN_POSIZIONE';
                        prezzoAcquistoUsd = prezzoAttualeUsd;
                        
                        let nettoInvestito = investimentoUSD - (investimentoUSD * FEE_DEX_PERCENTUALE);
                        quantitaTokenAcquistati = nettoInvestito / prezzoAcquistoUsd;

                        console.log(`\n\n🚀 [RIMBALZO RILEVATO!] Bot esploso a mercato! Comprato a $${prezzoAcquistoUsd.toFixed(6)}`);
                        // SPARA DAVVERO!
                        sparaAcquistoReale(tokenMint, investimentoUSD);
                        console.log(`👀 Fase 2: Tracciamento PnL Netto per i 10 centesimi...`);
                    }
                } 
                else if (stato === 'IN_POSIZIONE') {
                    let valoreLordo = quantitaTokenAcquistati * prezzoAttualeUsd;
                    let feeUscita = valoreLordo * FEE_DEX_PERCENTUALE;
                    let pnlNetto = (valoreLordo - investimentoUSD) - FEE_DI_RETE_TOTALE - feeUscita;

                    process.stdout.write(`\r📈 [TRADE LIVE] Valore: $${valoreLordo.toFixed(3)} | NETTO: $${pnlNetto.toFixed(3)}   `);

                    // TAKE PROFIT
if (pnlNetto >= TARGET_PROFITTO_NETTO) {
    connection.removeAccountChangeListener(subscriptionId);
    console.log(`\n\n🎯 [BERSAGLIO COLPITO] Profitto raggiunto! Sparo la VENDITA...`);
    sparaVenditaReale(tokenMint); // <-- IL GRILLETTO
    salvaPaperTrading(tokenMint, pnlNetto, "✅ WIN");
    chiediAzione();
}

// STOP LOSS
if (pnlNetto <= STOP_LOSS_NETTO) {
    connection.removeAccountChangeListener(subscriptionId);
    console.log(`\n\n⚠️ [PARACADUTE] Falso allarme. Fuga d'emergenza!`);
    sparaVenditaReale(tokenMint); // <-- IL GRILLETTO
    salvaPaperTrading(tokenMint, pnlNetto, "❌ LOSS");
    chiediAzione();
}
                }
            },
            'processed'
        );

    } catch (error) {
        console.log(`\n❌ Errore: ${error.message}`);
        chiediAzione();
    }
}
async function sparaAcquistoReale(tokenMint, investimentoUSD) {
    // Calcoliamo quanti SOL sono il tuo investimento in dollari
    const investimentoSOL = parseFloat((investimentoUSD / PREZZO_SOL_USD).toFixed(5));
    
    console.log(`\n⚙️ [PUMP-PORTAL] Richiesta payload di esecuzione per ${investimentoSOL} SOL...`);
    
    try {
        // 1. CHIEDIAMO A PUMP-PORTAL DI COSTRUIRE LA TRANSAZIONE
        const response = await fetch("https://pumpportal.fun/api/trade-local", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "publicKey": portafoglio.publicKey.toBase58(), // Il tuo Burner Wallet
                "action": "buy",             // Azione: Compra
                "mint": tokenMint,           // Il token bersaglio
                "denominatedInSol": "true",  // Investiamo i SOL, non un numero di token
                "amount": investimentoSOL,   // Quantità di SOL (es: 0.006 SOL)
                "slippage": 15,              // Slippage al 15% (fondamentale per non farsi respingere la tx dal dump bot)
                "priorityFee": 0.001,        // La nostra micro-fee (0.001 SOL)
                "pool": "pump"               // Cassa Pump.fun
            })
        });

        if (response.status !== 200) {
            console.log(`❌ Errore API PumpPortal: ${response.statusText}`);
            return;
        }

        // 2. RICEVIAMO IL PACCHETTO BINARIO (Buffer)
        const data = await response.arrayBuffer();
        const transazioneV0 = VersionedTransaction.deserialize(new Uint8Array(data));

        // 3. 🔏 LA FIRMA DIGITALE (Il timbro di autorizzazione del tuo PC)
        transazioneV0.sign([portafoglio]);
        console.log(`✅ [FIRMATO] Transazione crittografata. Fuoco su Helius!`);

        // 4. 🚀 SPARIAMO ALLA BLOCKCHAIN (Modalità MEV)
        const signature = await connection.sendTransaction(transazioneV0, {
            skipPreflight: true, // Trucco HFT: salta i controlli locali, spara direttamente ai validatori
            maxRetries: 2
        });

        console.log(`🔥 [ORDINE INVIATO] Bersaglio colpito! Traccia qui:`);
        console.log(`👉 https://solscan.io/tx/${signature}`);
        
        // Da qui la palla passa alla logica di "Tracciamento PnL Netto"
        
    } catch (error) {
        console.log(`❌ Errore nello sparo: ${error.message}`);
    }
}
async function sparaVenditaReale(tokenMint) {
    console.log(`\n⚙️ [PUMP-PORTAL] Generazione payload di VENDITA (100% + Recupero Affitto)...`);
    
    try {
        const response = await fetch("https://pumpportal.fun/api/trade-local", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "publicKey": portafoglio.publicKey.toBase58(),
                "action": "sell",
                "mint": tokenMint,
                "denominatedInSol": "false", // Non usiamo SOL come riferimento
                "amount": "100%",            // Vende l'intero bilancio del token
                "slippage": 15,              // Tolleranza per uscire a tutti i costi
                "priorityFee": 0.001,
                "pool": "pump"
            })
        });

        if (response.status !== 200) {
            console.log(`❌ Errore API PumpPortal: ${response.statusText}`);
            return;
        }

        const data = await response.arrayBuffer();
        const transazioneV0 = VersionedTransaction.deserialize(new Uint8Array(data));
        
        transazioneV0.sign([portafoglio]);
        console.log(`✅ [FIRMATO] Transazione di fuga pronta. Sgancio in corso...`);

        const signature = await connection.sendTransaction(transazioneV0, {
            skipPreflight: true,
            maxRetries: 2
        });

        console.log(`🔥 [VENDITA ESEGUITA] Cassetto chiuso e fondi recuperati!`);
        console.log(`👉 https://solscan.io/tx/${signature}`);

    } catch (error) {
        console.log(`❌ Errore nella vendita: ${error.message}`);
    }
}
function chiediAzione() {
    rl.question("\n📝 Incolla l'indirizzo del Token (oppure 'exit'): ", (tokenMint) => {
        if(tokenMint.toLowerCase() === 'exit') process.exit(0);
        rl.question("💰 Scegli importo (Es. '1' per 1$): ", (importo) => {
            const investimento = parseFloat(importo);
            if(isNaN(investimento)) return chiediAzione();
            avviaStalkerReale(tokenMint, investimento);
        });
    });
}

chiediAzione();