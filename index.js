require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');

const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, 'confirmed');
const PUMP_FUN_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfX9eA758vR1v22RoY");

// Nuova funzione: indaga sul passato del wallet
async function analyzeWalletOrigin(walletAddress) {
    console.log(`\n🕵️‍♂️ Avvio indagine sul wallet: ${walletAddress}`);
    try {
        const pubKey = new PublicKey(walletAddress);
        
        // Chiediamo a Solana lo storico delle transazioni di questo wallet (ultime 10)
        const history = await connection.getSignaturesForAddress(pubKey, { limit: 10 });
        
        if (history.length === 0) {
            console.log("Nessuna transazione passata. Questo wallet è un fantasma.");
            return;
        }

        console.log(`Trovate ${history.length} transazioni recenti per questo wallet.`);
        
        // I bot spesso usano wallet usa-e-getta appena creati (quindi avranno pochissime transazioni)
        if (history.length < 5) {
            console.log("⚠️ ALLERTA: Questo wallet è nato da pochissimo (tipico dei bot usa-e-getta).");
        }

        // La transazione più vecchia nella lista (l'ultima dell'array) è il momento in cui ha ricevuto i primi SOL
        const primaTransazione = history[history.length - 1].signature;
        console.log(`💸 Firma del probabile finanziamento iniziale: ${primaTransazione}`);
        console.log("Se apriamo questa transazione, troveremo il 'wallet madre' del truffatore.");

    } catch (error) {
        console.error("Errore durante l'indagine del wallet:", error.message);
    }
}

async function startRadar() {
    try {
        console.log("🔄 Connessione alla mainnet...");
        const currentSlot = await connection.getSlot();
        console.log(`✅ Connesso al blocco: ${currentSlot}`);
        console.log("📡 Radar attivo. In attesa della prima transazione...");

        const subscriptionId = connection.onLogs(
            PUMP_FUN_PROGRAM_ID,
            async (logs, context) => {
                const signature = logs.signature;
                console.log(`\n🚨 BERSAGLIO ACQUISITO! Firma: ${signature}`);
                
                // Spegniamo il radar
                await connection.removeOnLogsListener(subscriptionId);
                console.log("🛑 Radar in pausa per analizzare i dati...");

                try {
                    const txDetails = await connection.getParsedTransaction(signature, {
                        maxSupportedTransactionVersion: 0
                    });

                    if (txDetails) {
                        const accounts = txDetails.transaction.message.accountKeys;
                        const signers = accounts.filter(acc => acc.signer).map(acc => acc.pubkey.toString());
                        const mainSigner = signers[0];
                        
                        console.log(`\n✍️ Mittente principale (Signer): ${mainSigner}`);
                        
                        // Passiamo il signer alla nostra nuova funzione investigativa!
                        await analyzeWalletOrigin(mainSigner);

                    }
                } catch (err) {
                    console.error("Errore durante il parsing:", err.message);
                }
            },
            'confirmed'
        );

    } catch (error) {
        console.error("❌ Errore critico:", error.message);
    }
}

startRadar();