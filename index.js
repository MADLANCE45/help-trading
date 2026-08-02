require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');

const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, 'confirmed');
const PUMP_FUN_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfX9eA758vR1v22RoY");

async function startRadar() {
    try {
        console.log("🔄 Connessione alla mainnet...");
        const currentSlot = await connection.getSlot();
        console.log(`✅ Connesso al blocco: ${currentSlot}`);
        console.log("📡 Radar attivo. In attesa della prima transazione...");

        // Salviamo l'ID dell'ascoltatore per poterlo spegnere
        const subscriptionId = connection.onLogs(
            PUMP_FUN_PROGRAM_ID,
            async (logs, context) => {
                const signature = logs.signature;
                console.log(`\n🚨 BERSAGLIO ACQUISITO! Firma: ${signature}`);
                
                // 1. Spegniamo subito il radar per non essere bloccati dal nodo
                await connection.removeOnLogsListener(subscriptionId);
                console.log("🛑 Radar in pausa per analizzare i dati...");

                try {
                    // 2. Scarichiamo l'intera transazione dal nodo
                    // Usiamo maxSupportedTransactionVersion: 0 perché Solana usa transazioni "Versionate"
                    const txDetails = await connection.getParsedTransaction(signature, {
                        maxSupportedTransactionVersion: 0
                    });

                    if (txDetails) {
                        console.log("\n--- ANALISI TRANSAZIONE ---");
                        // Estraiamo tutti gli account (wallet e smart contract) coinvolti
                        const accounts = txDetails.transaction.message.accountKeys;
                        
                        console.log(`Trovati ${accounts.length} indirizzi coinvolti in questa operazione:`);
                        
                        // Filtriamo per vedere chi ha firmato la transazione (di solito è l'utente/bot che l'ha inviata)
                        const signers = accounts.filter(acc => acc.signer).map(acc => acc.pubkey.toString());
                        console.log(`✍️  Mittente principale (Signer): ${signers[0]}`);

                        // Mostriamo tutti gli altri wallet coinvolti
                        accounts.forEach((acc, index) => {
                            if (!acc.signer) {
                                console.log(`   [${index}] ${acc.pubkey.toString()}`);
                            }
                        });
                        console.log("---------------------------\n");
                    } else {
                        console.log("⚠️ Transazione non ancora disponibile sul nodo. Riprova.");
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