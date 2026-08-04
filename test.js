const fintoWebhookAvanzato = [
    {
        "signature": "9PumpFunScammerTX...Danger",
        "type": "SWAP",
        "fee": 150000,
        "source": "PUMP_FUN",
        "description": "User swapped 30 SOL using Jito Tip Router",
        "walletAgeDays": 0.5,       // Wallet creato da mezza giornata
        "percentageBought": 8.5     // Ha comprato l'8.5% della supply
    }
];

fetch('http://127.0.0.1:3000/webhook', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(fintoWebhookAvanzato)
})
.then(response => console.log("✅ Nuovo test avanzato inviato!"))
.catch(error => console.error("❌ Errore:", error));