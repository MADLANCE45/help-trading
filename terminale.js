const { VersionedTransaction } = require('@solana/web3.js');
require('dotenv').config();
const readline = require('readline');
const fs = require('fs');
const web3 = require('@solana/web3.js');
const bs58 = require('bs58');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');

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

// ==========================================
// ⚖️ CALIBRAZIONE PARAMETRI (AGGIORNATI)
// ==========================================
const FEE_DI_RETE_TOTALE = 0.03;    // Copre andata e ritorno
const FEE_DEX_PERCENTUALE = 0.01;   
const TARGET_PROFITTO_NETTO = 0.30; // Take profit più alto
const STOP_LOSS_NETTO = -0.15;      // Stop loss più stretto

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("\n=======================================================");
console.log(" 🦅 [RADAR-QUANT] MODALITÀ AVVOLTOIO (LOW-FEE & ANTI-MEV) 🦅");
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

        const isMigrato = accountIniziale.data.readUInt8(48) === 1;
        if (isMigrato) {
            console.log(`\n⚠️ SCARTATO: Il token ha superato i 69k MC ed è migrato su Raydium!`);
            return chiediAzione();
        }

        console.log(`✅ [CONFERMATO] Cassa attiva! Inizio Fase 1: OSSERVAZIONE DEL FONDO...\n`);

        // ==========================================
        // 📊 VARIABILI RADAR + FILTRO VOLUMI
        // ==========================================
        let stato = 'OSSERVAZIONE'; 
        let minimoLocale = Infinity;
        let prezzoAcquistoUsd = 0;
        let quantitaTokenAcquistati = 0;
        
        let prezzoPrecedente = 0;
        let acquistiSani = 0; // Il nostro contatore di veri compratori

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
                    
                    // 1. Contatore di Volume: Se il prezzo è salito rispetto a un istante fa, è un acquisto!
                    if (prezzoAttualeUsd > prezzoPrecedente) {
                        acquistiSani++;
                    }
                    prezzoPrecedente = prezzoAttualeUsd; // Aggiorniamo la memoria

                    // 2. Tracciamento del Fondo: Se scendiamo ancora, la moneta sta crollando. Resettiamo tutto.
                    if (prezzoAttualeUsd < minimoLocale) {
                        minimoLocale = prezzoAttualeUsd;
                        acquistiSani = 0; // Il contatore riparte da zero, niente false partenze.
                    }

                    const rimbalzoPerc = ((prezzoAttualeUsd - minimoLocale) / minimoLocale) * 100;
                    
                    // Stampiamo a schermo anche i "Tick" di acquisto
                    process.stdout.write(`\r🦅 [IN ATTESA] Minimo: $${minimoLocale.toFixed(6)} | Prezzo: $${prezzoAttualeUsd.toFixed(6)} | Rimbalzo: +${rimbalzoPerc.toFixed(2)}% | Tick Acquisto: ${acquistiSani}   `);

                    // ==========================================
                    // 🛡️ TRIGGER DOPPIA CONFERMA (Prezzo + Volume)
                    // ==========================================
                    // Scatta solo se: Rimbalzo Sano E almeno 5 transazioni umane distinte
                    if (rimbalzoPerc >= 2.0 && rimbalzoPerc <= 8.0 && acquistiSani >= 5) {
                        stato = 'IN_TRANSAZIONE'; 
                        prezzoAcquistoUsd = prezzoAttualeUsd;
                        
                        let nettoInvestito = investimentoUSD - (investimentoUSD * FEE_DEX_PERCENTUALE);
                        quantitaTokenAcquistati = nettoInvestito / prezzoAcquistoUsd;

                        console.log(`\n\n🚀 [CONFERMA VOLUMI: +${rimbalzoPerc.toFixed(2)}% con ${acquistiSani} tx] Bot a mercato a $${prezzoAcquistoUsd.toFixed(6)}`);
                        
                        sparaAcquistoReale(tokenMint, investimentoUSD);
                        
                        console.log(`⏳ Attendo 5 secondi per la conferma on-chain...`);
                        
                        setTimeout(() => {
                            stato = 'IN_POSIZIONE';
                            console.log(`\n✅ [CONFERMATO] Token in canna. Inizio Tracciamento PnL Reale...`);
                        }, 5000); 
                    } 
                    else if (rimbalzoPerc > 8.0) {
                        // Trappola Pump anomalo: Resettiamo i target
                        minimoLocale = prezzoAttualeUsd; 
                        acquistiSani = 0;
                    }
                } 
                else if (stato === 'IN_POSIZIONE') {
                    let valoreLordo = quantitaTokenAcquistati * prezzoAttualeUsd;
                    let feeUscita = valoreLordo * FEE_DEX_PERCENTUALE;
                    let pnlNetto = (valoreLordo - investimentoUSD) - FEE_DI_RETE_TOTALE - feeUscita;

                    process.stdout.write(`\r📈 [TRADE LIVE] Valore: $${valoreLordo.toFixed(3)} | NETTO: $${pnlNetto.toFixed(3)}   `);

                    // TAKE PROFIT
                    if (pnlNetto >= TARGET_PROFITTO_NETTO) {
                        stato = 'OPERAZIONE_CONCLUSA'; // 🔒 Blocca doppi spari
                        connection.removeAccountChangeListener(subscriptionId);
                        console.log(`\n\n🎯 [BERSAGLIO COLPITO] Profitto raggiunto! Sparo la VENDITA...`);
                        sparaVenditaReale(tokenMint);
                        salvaPaperTrading(tokenMint, pnlNetto, "✅ WIN");
                        setTimeout(chiediAzione, 3000); 
                    }

                    // STOP LOSS
                    if (pnlNetto <= STOP_LOSS_NETTO) {
                        stato = 'OPERAZIONE_CONCLUSA'; // 🔒 Blocca doppi spari
                        connection.removeAccountChangeListener(subscriptionId);
                        console.log(`\n\n⚠️ [PARACADUTE] Stop Loss colpito. Fuga d'emergenza!`);
                        sparaVenditaReale(tokenMint);
                        salvaPaperTrading(tokenMint, pnlNetto, "❌ LOSS");
                        setTimeout(chiediAzione, 3000);
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
    const investimentoSOL = parseFloat((investimentoUSD / PREZZO_SOL_USD).toFixed(5));
    console.log(`\n⚙️ [PUMP-PORTAL] Richiesta acquisto per ${investimentoSOL} SOL (Slippage: 3%, Fee: 0.0001)...`);
    
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
                "slippage": 3,              // FIX APPLICATO (Anti-MEV)
                "priorityFee": 0.0001,      // FIX APPLICATO (Low Fee)
                "pool": "pump"
            })
        });

        if (response.status !== 200) return console.log(`❌ Errore API: ${response.statusText}`);

        const data = await response.arrayBuffer();
        const transazioneV0 = VersionedTransaction.deserialize(new Uint8Array(data));
        transazioneV0.sign([portafoglio]);
        
        const signature = await connection.sendTransaction(transazioneV0, { skipPreflight: true, maxRetries: 2 });
        console.log(`🔥 [ORDINE INVIATO] 👉 https://solscan.io/tx/${signature}`);
    } catch (error) {
        console.log(`❌ Errore Acq: ${error.message}`);
    }
}

async function sparaVenditaReale(tokenMint) {
    console.log(`\n⚙️ [PUMP-PORTAL] Richiesta VENDITA 100% (Slippage: 3%, Fee: 0.0001)...`);
    
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
                "slippage": 3,              // FIX APPLICATO (Anti-MEV)
                "priorityFee": 0.0001,      // FIX APPLICATO (Low Fee)
                "pool": "pump"
            })
        });

        if (response.status !== 200) return console.log(`❌ Errore API: ${response.statusText}`);

        const data = await response.arrayBuffer();
        const transazioneV0 = VersionedTransaction.deserialize(new Uint8Array(data));
        transazioneV0.sign([portafoglio]);
        
        const signature = await connection.sendTransaction(transazioneV0, { skipPreflight: true, maxRetries: 2 });
        console.log(`🔥 [VENDITA ESEGUITA] 👉 https://solscan.io/tx/${signature}`);
    } catch (error) {
        console.log(`❌ Errore Vendita: ${error.message}`);
    }
}

function chiediAzione() {
    rl.question("\n📝 Incolla l'indirizzo del Token (oppure 'exit'): ", (tokenMint) => {
        if(tokenMint.toLowerCase() === 'exit') process.exit(0);
        rl.question("💰 Scegli importo (Consigliato 2 o 3 per assorbire le fee): ", (importo) => {
            const investimento = parseFloat(importo);
            if(isNaN(investimento)) return chiediAzione();
            avviaStalkerReale(tokenMint, investimento);
        });
    });
}

chiediAzione();