const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Aumentiamo il limite del payload perché i blocchi di Solana possono essere pesanti
app.use(bodyParser.json({ limit: '50mb' }));

// Il nostro "Radar" ora è un endpoint REST
app.post('/webhook', async (req, res) => {
    const payload = req.body;

    // Rispondiamo ISTANTANEAMENTE con 200 OK per evitare che Helius vada in timeout e ritenti l'invio
    res.status(200).send('Webhook ricevuto');

    // Analizziamo il payload in background
    if (payload && payload.length > 0) {
        console.log(`\n🚨 RICEVUTE ${payload.length} TRANSAZIONI DA HELIUS!`);
        
        payload.forEach(tx => {
            console.log(`--------------------------------------------------`);
            console.log(`Firma: ${tx.signature}`);
            console.log(`Mittente (Fee Payer): ${tx.feePayer}`);
            console.log(`Tipo: ${tx.type}`);
            
            // Qui innesteremo la logica per l'analisi dei Jito Bundles e le tempistiche (Δt)
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server Radar avviato e in ascolto sulla porta ${PORT}`);
    console.log(`In attesa dei webhook su http://localhost:${PORT}/webhook`);
});