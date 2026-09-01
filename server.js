/*require('dotenv').config(); // FONDAMENTALE: Deve essere la riga 1!

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

// Inizializza Supabase (Solo una volta!)
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY
);

// Inizializza Groq AI
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const app = express();
const PORT = process.env.PORT || 3000;
const HELIUS_API_KEY = "b85ff0ae-b208-4fe9-897b-1d7a446b9d36"; // Ti consiglio di metterla nel .env futuro

// Sicurezza: CORS configurato in modo permissivo (per lo sviluppo)
app.use(cors({ origin: "*" })); // Accetta richieste da qualsiasi frontend (localhost o Vercel)
app.use(express.json());

// Setup Server HTTP e WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- 1. WEBSOCKET: IL FEED LIVE ---
io.on('connection', (socket) => {
  console.log('🟢 Frontend connesso al flusso Live!');
});

// Simulatore di token in trend
setInterval(() => {
  const dummyTokens = ["BZKJ1Sap26qFin64RpBajaiYAxGhLudjKgUhZ6mupump", "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "WIFvKP6v615L4p5xG4qgQ4q56xQ6x5x5x5x5x5x5x5x"];
  const randomMint = dummyTokens[Math.floor(Math.random() * dummyTokens.length)];
  
  io.emit('newToken', {
    symbol: randomMint.substring(0, 4).toUpperCase(),
    address: randomMint,
    liquidity: (Math.random() * 50 + 10).toFixed(2)
  });
}, 10000); 

// --- 2. API: LA ROTTA MANCANTE CHE CAUSAVA "NODE OFFLINE" (La Dashboard) ---
app.get('/api/wallet-audit/:address', (req, res) => {
    const address = req.params.address;
    console.log(`🩺 Dashboard sta richiedendo l'audit per il wallet: ${address}`);
    
    // Per ora simuliamo i dati del wallet per non consumare troppe API,
    // ma la struttura è pronta per agganciarsi ad Helius per analizzare il wallet dell'utente.
    res.json({
        score: Math.floor(Math.random() * 40 + 60), // Da 60 a 100
        totalTrades: Math.floor(Math.random() * 500) + 12,
        winRate: `${Math.floor(Math.random() * 40 + 30)}%`
    });
});

// --- 3. API REST: IL RADAR INTELLIGENTE (Colonna Destra / Estensione) CON GROQ ---
app.get('/api/scan/:tokenMint', async (req, res) => {
    const tokenMint = req.params.tokenMint;
    console.log(`\n🕵️ Avvio analisi on-chain in tempo reale per: ${tokenMint}`);

    const url = `https://api.helius.xyz/v0/addresses/${tokenMint}/transactions?api-key=${HELIUS_API_KEY}`;

    try {
        // Step 1: Estrai dati grezzi da Helius
        const response = await fetch(url);
        if (!response.ok) return res.status(response.status).json({ error: "Connessione negata da Helius." });
        const data = await response.json();

        // Mappatura base dei dumper
        const walletStats = {}; 
        let totalTransfers = 0;

        data.forEach(tx => {
            if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
                tx.tokenTransfers.forEach(transfer => {
                    if (transfer.mint === tokenMint) {
                        totalTransfers++;
                        const userWallet = transfer.userAccount;
                        if (!walletStats[userWallet]) walletStats[userWallet] = { buys: 0, sells: 0 };
                        if (transfer.toUserAccount === userWallet) walletStats[userWallet].buys += 1;
                        else if (transfer.fromUserAccount === userWallet) walletStats[userWallet].sells += 1;
                    }
                });
            }
        });

        let dumperTrovati = 0;
        for (const [wallet, stats] of Object.entries(walletStats)) {
            if (stats.sells >= 3 && stats.sells > stats.buys * 2) {
                dumperTrovati++;
            }
        }

        console.log(`🧠 Invocazione Groq AI (Llama 3)... Trovati ${dumperTrovati} dumpers sospetti.`);

        // Step 2: Diamo in pasto i dati crudi all'AI ultra-veloce di Groq
        const prompt = `You are Meme Saver AI, an institutional-grade on-chain analyst. Analyze this token contract: ${tokenMint}. 
        Helius detected ${totalTransfers} recent token transfers. 
        We found ${dumperTrovati} wallets engaging in micro-dumping behavior (selling many small chunks rapidly).
        
        Provide a JSON response strictly matching this structure (no other text):
        {
          "trustScore": [integer 0 to 100, deduct heavily for dumpers],
          "status": ["SAFE" or "WARNING" or "AVOID"],
          "judgment": ["A single sentence, max 15 words, sounding like an institutional quantitative analyst warning about the dumpers or praising the distribution."]
        }`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama3-8b-8192", // Modello velocissimo
            temperature: 0.2,
            response_format: { type: "json_object" } // Forza Llama a rispondere SOLO in JSON!
        });

        // Parse della risposta dell'AI
        const aiResponse = JSON.parse(chatCompletion.choices[0].message.content);
        
        console.log("✅ Groq AI Scan Completato in un lampo:", aiResponse);

        // Risposta formatata esattamente per la nostra UI React
        res.json({
            trustScore: aiResponse.trustScore,
            status: aiResponse.status,
            judgment: aiResponse.judgment,
            microDumpRisk: dumperTrovati * 20 > 100 ? 100 : dumperTrovati * 20,
            supplyIntegrity: aiResponse.trustScore, 
            devTrust: Math.max(aiResponse.trustScore - 10, 0),
            sybilResistance: 100 - (dumperTrovati * 5)
        });

    } catch (error) {
        console.error("❌ Errore Server:", error);
        res.status(500).json({ error: "Errore di analisi on-chain" });
    }
});

// Endpoint per far connettere l'estensione al server (Auth)
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
        isPro: user.plan_type === 'pro' || user.plan_type === 'premium',
        scansRemaining: user.scans_remaining 
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Terminal Node Engine in ascolto su porta ${PORT}`);
});