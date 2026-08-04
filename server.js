const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;
const API_KEY = "b85ff0ae-b208-4fe9-897b-1d7a446b9d36"; // <-- Inserisci qui la tua API Key di Helius

app.use(cors());
app.use(express.json());

app.get('/api/scan/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;
    console.log(`\n🕵️ Avvio analisi on-chain in tempo reale per: ${tokenMint}`);

    const url = `https://api.helius.xyz/v0/addresses/${tokenMint}/transactions?api-key=${API_KEY}`;

    try {
        const response = await fetch(url);

        // 🛡️ Controllo autorizzazione
        if (!response.ok) {
            const textError = await response.text();
            console.error(`❌ Blocco API Helius (Status ${response.status}): ${textError}`);
            return res.status(response.status).json({ 
                error: `Connessione negata da Helius. Controlla l'API Key.` 
            });
        }

        const data = await response.json();

        // 🛡️ Sicurezza: controlliamo che i dati siano un array
        if (!Array.isArray(data)) {
            return res.status(400).json({ error: "Formato dati imprevisto dalla blockchain" });
        }

        // ==========================================
        // QUI È DOVE MANCAVA LA VARIABILE!
        const walletStats = {}; 
        // ==========================================

        // 1. Mappiamo i trasferimenti
        data.forEach(tx => {
            if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
                tx.tokenTransfers.forEach(transfer => {
                    if (transfer.mint === tokenMint) {
                        const userWallet = transfer.userAccount;
                        
                        // Creiamo il portafoglio se non esiste in walletStats
                        if (!walletStats[userWallet]) {
                            walletStats[userWallet] = { acquisti: 0, vendite: 0 };
                        }

                        if (transfer.toUserAccount === userWallet) {
                            walletStats[userWallet].acquisti += 1;
                        } else if (transfer.fromUserAccount === userWallet) {
                            walletStats[userWallet].vendite += 1;
                        }
                    }
                });
            }
        });

        // 2. Analizziamo i dati
        let dumperTrovati = 0;
        let motivi = [];
        let score = 10;

        for (const [wallet, stats] of Object.entries(walletStats)) {
            if (stats.vendite >= 4 && stats.vendite > stats.acquisti * 3) {
                dumperTrovati++;
                console.log(`🚨 DUMPER TROVATO: ${wallet} (IN: ${stats.acquisti}, OUT: ${stats.vendite})`);
            }
        }

        // 3. Verdetto finale
        let rischio = "🟢 SICURO (Nessun pattern anomalo rilevato)";
        
        if (dumperTrovati > 0) {
            rischio = "🔴 RUG/SNIPER BOT RILEVATO";
            score = Math.min(80 + (dumperTrovati * 5), 100); // Assicura che lo score non superi mai 100
            motivi.push(`Rilevati ${dumperTrovati} portafogli con pattern di Micro-Dumping costante.`);
        }

        const analisiResponse = {
            token: tokenMint,
            rischio: rischio,
            score: score,
            dumperTrovati: dumperTrovati,
            motivi: motivi
        };

        // Inviamo la risposta all'estensione
        res.json(analisiResponse);

    } catch (error) {
        console.error("❌ Errore durante il recupero dei dati da Helius:", error);
        res.status(500).json({ error: "Errore di connessione alla blockchain" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Radar API Server in ascolto su http://localhost:${PORT}`);
});