const fs = require('fs');

const FILE_PAPER = './paper_trading.json';

console.clear();
console.log("=======================================================");
console.log(" 📊 [RADAR-QUANT] AUTOPSIA DEI TRADE (REPORT FINANZIARIO) 📊");
console.log("=======================================================\n");

if (!fs.existsSync(FILE_PAPER)) {
    console.log("❌ Nessun file storico trovato. Fai prima qualche trade!");
    process.exit(0);
}

const data = JSON.parse(fs.readFileSync(FILE_PAPER, 'utf8'));
const trades = data.trades;

if (!trades || trades.length === 0) {
    console.log("⚠️ Il file esiste ma non ci sono trade registrati.");
    process.exit(0);
}

let winCount = 0;
let lossCount = 0;
let totalWinUsd = 0;
let totalLossUsd = 0;

trades.forEach(trade => {
    // FIX: Estraiamo il numero, indipendentemente da come era stato nominato nelle vecchie versioni del bot
    let pnl = trade.pnl_netto_usd !== undefined ? parseFloat(trade.pnl_netto_usd) : parseFloat(trade.pnl);
    
    // SCUDO: Se la riga è vecchia e illeggibile, la saltiamo per non far esplodere la calcolatrice
    if (isNaN(pnl)) return;

    const isWin = (trade.esito && trade.esito.includes('WIN')) || pnl > 0;

    if (isWin) {
        winCount++;
        totalWinUsd += pnl;
    } else {
        lossCount++;
        totalLossUsd += pnl;
    }
});

// Ricalcoliamo il totale ESATTAMENTE sui trade sani, scartando i bug passati
const totalTrades = winCount + lossCount; 
const winRate = totalTrades > 0 ? ((winCount / totalTrades) * 100).toFixed(2) : 0;
const avgWin = winCount > 0 ? (totalWinUsd / winCount).toFixed(3) : 0;
const avgLoss = lossCount > 0 ? (totalLossUsd / lossCount).toFixed(3) : 0;
const pnlTotale = (totalWinUsd + totalLossUsd).toFixed(3);

console.log(`🔹 Trade Validi Analizzati: ${totalTrades}`);
console.log(`🟢 Vittorie (WIN): ${winCount}`);
console.log(`🔴 Sconfitte (LOSS): ${lossCount}`);
console.log(`🎯 Win Rate Reale: ${winRate}%`);
console.log("-------------------------------------------------------");
console.log(`💸 Profitto Medio per WIN: +$${avgWin}`);
console.log(`🩸 Perdita Media per LOSS: -$${Math.abs(avgLoss)}`);

let rr = 0;
if (avgLoss != 0) {
    rr = Math.abs(avgWin / avgLoss).toFixed(2);
}
console.log(`📊 Rapporto Rischio/Rendimento Reale: 1 : ${rr}`);
console.log("=======================================================");

if (pnlTotale >= 0) {
    console.log(`💰 PNL NETTO TOTALE: +$${pnlTotale} (SEI IN PROFITTO!)`);
} else {
    console.log(`📉 PNL NETTO TOTALE: -$${Math.abs(pnlTotale)} (Stai sanguinando)`);
}
console.log("=======================================================\n");

console.log("🔍 ULTIMI 5 TRADE:");
const ultimiTrade = trades.slice(-5);
ultimiTrade.forEach(t => {
    let pnl = t.pnl_netto_usd !== undefined ? parseFloat(t.pnl_netto_usd) : parseFloat(t.pnl);
    if (isNaN(pnl)) return; // Salta in stampa se è rotto
    
    const icona = pnl >= 0 ? "🟢" : "🔴";
    const mint = t.mint ? t.mint.substring(0,8) : "Ignoto";
    console.log(`${icona} [${t.data}] Token: ${mint}... | PnL: $${pnl.toFixed(4)}`);
});
console.log("\n");