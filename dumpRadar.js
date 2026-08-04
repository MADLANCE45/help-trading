const API_KEY = "b85ff0ae-b208-4fe9-897b-1d7a446b9d36"; 
// Usiamo uno dei token che il bot ha cecchinato
const TOKEN_MINT = "BZKJ1Sap26qFin64RpBajaiYAxGhLudjKgUhZ6mupump"; 

async function analizzaMicroDumping() {
    const url = `https://api.helius.xyz/v0/addresses/${TOKEN_MINT}/transactions?api-key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        console.log(`\n📊 Analisi Micro-Dumping per il Token: ${TOKEN_MINT.substring(0, 8)}...`);
        console.log(`--------------------------------------------------`);

        // Oggetto per mappare il comportamento di ogni portafoglio
        const walletStats = {};

        data.forEach(tx => {
            if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
                tx.tokenTransfers.forEach(transfer => {
                    // Consideriamo solo i movimenti del token che stiamo analizzando
                    if (transfer.mint === TOKEN_MINT) {
                        const userWallet = transfer.userAccount;
                        
                        // Inizializza il contatore per i nuovi wallet
                        if (!walletStats[userWallet]) {
                            walletStats[userWallet] = { acquisti: 0, vendite: 0, totaleScambiato: 0 };
                        }

                        // Logica semplificata: se l'ammontare è positivo verso il wallet, è un acquisto.
                        // Su Solana/Helius, capire la direzione esatta richiede di guardare "fromUserAccount" e "toUserAccount"
                        if (transfer.toUserAccount === userWallet) {
                            walletStats[userWallet].acquisti += 1;
                        } else if (transfer.fromUserAccount === userWallet) {
                            walletStats[userWallet].vendite += 1;
                        }
                    }
                });
            }
        });

        // Ora filtriamo e cerchiamo i Dumper
        let dumperTrovati = 0;
        
        for (const [wallet, stats] of Object.entries(walletStats)) {
            // REGOLA MICRO-DUMP: Ha venduto più di 4 volte rispetto agli acquisti
            if (stats.vendite >= 4 && stats.vendite > stats.acquisti * 3) {
                dumperTrovati++;
                console.log(`🚨 DUMPER RILEVATO: ${wallet}`);
                console.log(`   📉 Ha comprato ${stats.acquisti} volta/e, ma ha già VENDUTO ${stats.vendite} volte!`);
                console.log(`   ⚠️ Pattern: Sta scaricando lentamente le sue monete per non far crollare il grafico.`);
                console.log(`--------------------------------------------------`);
            }
        }

        if (dumperTrovati === 0) {
            console.log(`✅ Nessun pattern di micro-dumping evidente nelle ultime transazioni.`);
        }

    } catch (error) {
        console.error("❌ Errore durante l'analisi:", error);
    }
}

analizzaMicroDumping();