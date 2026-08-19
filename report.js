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

if (trades.length === 0) {
    console.log("⚠️ Il file esiste ma non ci sono trade registrati.");
    process.exit(0);
}

let winCount = 0;
let lossCount = 0;
let totalWinUsd = 0;
let totalLossUsd = 0;

trades.forEach(trade => {
    // FIX: Controllo se l'esito esiste, altrimenti mi baso matematicamente sul profitto
    const isWin = (trade.esito && trade.esito.includes('WIN')) || trade.pnl_netto_usd > 0;
    
    if (isWin) {
        winCount++;
        totalWinUsd += trade.pnl_netto_usd;
    } else {
        lossCount++;
        totalLossUsd += trade.pnl_netto_usd;
    }
});

const totalTrades = trades.length;
const winRate = ((winCount / totalTrades) * 100).toFixed(2);
const avgWin = winCount > 0 ? (totalWinUsd / winCount).toFixed(3) : 0;
const avgLoss = lossCount > 0 ? (totalLossUsd / lossCount).toFixed(3) : 0;
const pnlTotale = (totalWinUsd + totalLossUsd).toFixed(3);

console.log(`🔹 Trade Totali Eseguiti: ${totalTrades}`);
console.log(`🟢 Vittorie (WIN): ${winCount}`);
console.log(`🔴 Sconfitte (LOSS): ${lossCount}`);
console.log(`🎯 Win Rate (Percentuale di Successo): ${winRate}%`);
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
    const icona = t.pnl_netto_usd >= 0 ? "🟢" : "🔴";
    console.log(`${icona} [${t.data}] Token: ${t.mint.substring(0,8)}... | PnL: $${t.pnl_netto_usd}`);
});
console.log("\n");