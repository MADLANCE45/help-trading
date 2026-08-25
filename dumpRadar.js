const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// 1. SETUP SERVER E WEBSOCKET
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // L'indirizzo della tua Dashboard React
    methods: ["GET", "POST"]
  }
});

const API_KEY = "b85ff0ae-b208-4fe9-897b-1d7a446b9d36"; 
const TOKEN_MINT = "BZKJ1Sap26qFin64RpBajaiYAxGhLudjKgUhZ6mupump"; 

const recentTokens = []; // La nostra cache a breve termine

io.on('connection', (socket) => {
  console.log('🟢 Frontend Connesso al Radar!');
  
  // LA MAGIA: Appena il frontend si connette, gli spariamo subito lo storico!
  socket.emit('initTokens', recentTokens);

  socket.on('disconnect', () => console.log('🔴 Frontend Disconnesso'));
});

// 2. IL TUO ALGORITMO DI MICRO-DUMPING
async function analizzaMicroDumping() {
    const url = `https://api.helius.xyz/v0/addresses/${TOKEN_MINT}/transactions?api-key=${API_KEY}`;
    
    try {
        console.log(`\n⏳ Scansione in corso per ${TOKEN_MINT.substring(0, 8)}...`);
        const response = await fetch(url);
        const data = await response.json();
        
        const walletStats = {};

        data.forEach(tx => {
            if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
                tx.tokenTransfers.forEach(transfer => {
                    if (transfer.mint === TOKEN_MINT) {
                        const userWallet = transfer.userAccount;
                        
                        if (!walletStats[userWallet]) {
                            walletStats[userWallet] = { acquisti: 0, vendite: 0, totaleScambiato: 0 };
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

        let dumperTrovati = 0;
        
        for (const [wallet, stats] of Object.entries(walletStats)) {
            // LA TUA REGOLA D'ORO
            if (stats.vendite >= 4 && stats.vendite > stats.acquisti * 3) {
                dumperTrovati++;
                console.log(`🚨 DUMPER RILEVATO: ${wallet} (Acquisti: ${stats.acquisti}, Vendite: ${stats.vendite})`);
            }
        }

        // 3. CALCOLO TRUST SCORE E INVIO AL FRONTEND
        // Partiamo da 100. Ogni dumper trovato toglie 30 punti.
        // ... (Tieni tutta la parte sopra uguale, fino a let dumperTrovati = 0;) ...

        // 3. CALCOLO TRUST SCORE E FILTRO INTELLIGENTE
        let trustScore = 100 - (dumperTrovati * 30);
        if (trustScore < 5) trustScore = 5;

        console.log(`✅ Analisi completata per ${TOKEN_MINT.substring(0,6)}... Dumper: ${dumperTrovati} | Trust Score: ${trustScore}%`);

        // TRASMISSIONE INTELLIGENTE: Inviamo al frontend solo se non è uno scam palese (Score > 20)
        if (trustScore > 20) {
            const tokenData = {
                symbol: 'NEW_PAIR', 
                address: TOKEN_MINT,
                liquidity: (Math.random() * 50 + 10).toFixed(2),
                trustScore: trustScore,
                timestamp: Date.now()
            };

            // Salviamo il token nella memoria del server (max 50)
            recentTokens.unshift(tokenData);
            if (recentTokens.length > 50) recentTokens.pop();

            // Inviamo il nuovo token a chi è connesso in quel momento
            io.emit('newToken', tokenData);
            console.log(`📡 Token inviato alla Dashboard React.`);
        }

    } catch (error) {
        console.error("❌ Errore durante l'analisi API Helius:", error);
    }
}

// 4. MOTORE DI RICERCA CONTINUA (Il "Cacciatore")
server.listen(3000, () => {
  console.log('🚀 Server Radar acceso e in ascolto sulla porta 3000...');
  
  // LOGICA INTELLIGENTE: Invece di chiedere mille volte al secondo, 
  // simuliamo l'arrivo di un nuovo token ogni 8 secondi per non bruciare le API.
  // (In produzione qui metteremo l'ascolto WebSocket di Helius sui nuovi pool Raydium)
  
  setInterval(() => {
      console.log('\n🔍 Rilevato nuovo lancio on-chain. Avvio autopsia del codice...');
      analizzaMicroDumping();
  }, 8000); 
});