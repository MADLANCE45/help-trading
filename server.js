require('dotenv').config(); // FONDAMENTALE: Deve essere la riga 1!

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

// Inizializza Supabase con i poteri di Amministratore (Service Role)
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY
);

const app = express();
// ... resto del tuo codice Node.js ...
const PORT = 3000;
const API_KEY = "b85ff0ae-b208-4fe9-897b-1d7a446b9d36"; // La tua API Key Helius

// Setup CORS per permettere a React di comunicare
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Setup Server HTTP e WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

// --- 1. WEBSOCKET: IL FEED LIVE (Colonna Sinistra) ---
io.on('connection', (socket) => {
  console.log('🟢 Frontend React connesso al flusso Live!');
});

// Simulatore di token in trend (nella realtà qui ascolterai i webhook di Helius sui nuovi pool)
setInterval(() => {
  const dummyTokens = ["BZKJ1Sap26qFin64RpBajaiYAxGhLudjKgUhZ6mupump", "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "WIFvKP6v615L4p5xG4qgQ4q56xQ6x5x5x5x5x5x5x5x"];
  const randomMint = dummyTokens[Math.floor(Math.random() * dummyTokens.length)];
  
  io.emit('newToken', {
    symbol: randomMint.substring(0, 4).toUpperCase(),
    address: randomMint,
    liquidity: (Math.random() * 50 + 10).toFixed(2)
  });
}, 10000); // Spara un token ogni 10 secondi nella colonna sinistra

// --- 2. API REST: L'AUTOPSIA ON-DEMAND (Colonna Destra / Estensione) ---
app.get('/api/scan/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;
    console.log(`\n🕵️ Avvio analisi on-chain in tempo reale per: ${tokenMint.substring(0,8)}...`);

    const url = `https://api.helius.xyz/v0/addresses/${tokenMint}/transactions?api-key=${API_KEY}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).json({ error: "Connessione negata da Helius." });
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            return res.status(400).json({ error: "Formato dati imprevisto" });
        }

        const walletStats = {}; 

        // Il tuo algoritmo di mappatura
        data.forEach(tx => {
            if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
                tx.tokenTransfers.forEach(transfer => {
                    if (transfer.mint === tokenMint) {
                        const userWallet = transfer.userAccount;
                        if (!walletStats[userWallet]) walletStats[userWallet] = { acquisti: 0, vendite: 0 };

                        if (transfer.toUserAccount === userWallet) walletStats[userWallet].acquisti += 1;
                        else if (transfer.fromUserAccount === userWallet) walletStats[userWallet].vendite += 1;
                    }
                });
            }
        });

        // Analisi Dumper
        let dumperTrovati = 0;
        for (const [wallet, stats] of Object.entries(walletStats)) {
            if (stats.vendite >= 4 && stats.vendite > stats.acquisti * 3) {
                dumperTrovati++;
            }
        }

        // --- FIX MATEMATICO DEL TRUST SCORE ---
        // 100 = Perfetto. Ogni dumper toglie 20 punti. Minimo 5.
        let trustScore = Math.max(100 - (dumperTrovati * 20), 5);
        
        let status = trustScore >= 70 ? 'SAFE' : trustScore >= 40 ? 'WARNING' : 'AVOID';
        let judgment = trustScore >= 70 
            ? 'No anomalies detected. Safe supply distribution.' 
            : `High risk: ${dumperTrovati} micro-dumping wallets detected.`;

        // Risposta formatata esattamente per la nostra UI React
        res.json({
            trustScore: trustScore,
            status: status,
            judgment: judgment,
            microDumpRisk: dumperTrovati * 20 > 100 ? 100 : dumperTrovati * 20,
            supplyIntegrity: trustScore, // Simulato proporzionalmente
            devTrust: trustScore - 10,   // Simulato proporzionalmente
            sybilResistance: 90          // Fisso per ora
        });

    } catch (error) {
        console.error("❌ Errore Server:", error);
        res.status(500).json({ error: "Errore di connessione alla blockchain" });
    }
});
const { createClient } = require('@supabase/supabase-js');
// Inizializza Supabase nel backend
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Endpoint per far connettere l'estensione al server
app.post('/api/auth/verify', async (req, res) => {
    const { walletAddress } = req.body;
    
    // Controlliamo il wallet nel DB
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

    if (!user) return res.json({ isValid: false, isPro: false });

    // Restituiamo all'estensione lo stato dell'utente
    res.json({ 
        isValid: true, 
        isPro: user.is_pro,
        scansRemaining: user.scans_remaining 
    });
});
server.listen(PORT, () => {
    console.log(`🚀 Radar API Server & WebSockets in ascolto su porta ${PORT}`);
});