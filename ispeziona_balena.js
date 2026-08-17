require('dotenv').config();
const fs = require('fs');
const { Connection, PublicKey } = require('@solana/web3.js');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const solanaConnection = new Connection(RPC_URL);

// IL WALLET ALGORITMICO DA ISPEZIONARE
const TARGET_WALLET = "38HGfTmj2y3Q3PPWpsfrMVHxdwvJJQvDP1HuT5DyjHQV";
const FILE_LOG = "spy_log_pro.json"; // Nome nuovo per non mischiare i dati!

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// =====================================================================
// 1. MOTORE DI ESTRAZIONE SICURA
// =====================================================================
async function scaricaEAnalizza() {
    console.log(`\n🕵️ INIZIO INDAGINE FORENSE SU: ${TARGET_WALLET}`);

    let storico = [];
    
    // CARICA STORICO ESISTENTE (se c'è)
    if (fs.existsSync(FILE_LOG)) {
        storico = JSON.parse(fs.readFileSync(FILE_LOG, 'utf8'));
        console.log(`📁 Trovate ${storico.length} transazioni già salvate in locale.`);
    }

    try {
        console.log(`⏳ Scarico l'elenco delle transazioni dal nodo...`);
        const sigs = await solanaConnection.getSignaturesForAddress(new PublicKey(TARGET_WALLET), { limit: 100 });
        
        const nuoveFirme = sigs.filter(s => !storico.some(tx => tx.firma === s.signature));
        
        if (nuoveFirme.length === 0) {
            console.log(`✅ Nessuna nuova transazione trovata. Il file è già aggiornato!`);
        } else {
            console.log(`🎣 Trovate ${nuoveFirme.length} NUOVE transazioni. Inizio download sicuro...`);

            // DOWNLOAD A BLOCCHI CON SALVATAGGIO ISTANTANEO
            for (let i = 0; i < nuoveFirme.length; i += 5) {
                const chunk = nuoveFirme.slice(i, i + 5).map(s => s.signature);
                const txs = await solanaConnection.getParsedTransactions(chunk, { maxSupportedTransactionVersion: 0 });
                
                for (const tx of txs) {
                    if (!tx || !tx.meta) continue;

                    const postBals = tx.meta.postTokenBalances || [];
                    const preBals = tx.meta.preTokenBalances || [];
                    
                    for (let post of postBals) {
                        if (post.owner !== TARGET_WALLET || post.mint === "So11111111111111111111111111111111111111112") continue;
                        
                        const mint = post.mint;
                        const pre = preBals.find(b => b.owner === TARGET_WALLET && b.mint === mint);
                        const preAmount = pre ? pre.uiTokenAmount.uiAmount : 0;
                        const postAmount = post.uiTokenAmount.uiAmount;
                        
                        if (preAmount !== postAmount) {
                            storico.push({
                                firma: tx.transaction.signatures[0],
                                tipo: postAmount > preAmount ? 'BUY' : 'SELL',
                                mint: mint,
                                differenzaToken: Math.abs(postAmount - preAmount),
                                timestamp: tx.blockTime * 1000
                            });
                        }
                    }
                }
                
                // 💾 SALVATAGGIO AD OGNI CICLO!
                fs.writeFileSync(FILE_LOG, JSON.stringify(storico, null, 2));
                console.log(`[+] Scaricate e SALVATE ${Math.min(i + 5, nuoveFirme.length)}/${nuoveFirme.length}... (pausa 3s)`);
                await delay(3000); 
            }
            console.log(`\n💾 Download completato con successo!`);
        }

        // ESECUZIONE AUTOPSIA
        analizzaDatiLocali(storico);

    } catch (e) {
        console.error(`\n❌ ERRORE (Helius Rate Limit o Rete): ${e.message}`);
        console.log(`⚠️ Processo interrotto. Ma i dati scaricati finora sono stati SALVATI!`);
        if (storico.length > 0) analizzaDatiLocali(storico);
    }
}

// =====================================================================
// 2. MICROSCOPIO FINANZIARIO V2: ANALISI COMPORTAMENTALE E WIN-RATE
// =====================================================================
function analizzaDatiLocali(storico) {
    console.log(`\n📊 === AUTOPSIA AVANZATA LIVELLO 2 ===`);
    
    const datiPuliti = storico.filter(tx => tx.mint && tx.mint !== 'undefined');
    if (datiPuliti.length === 0) return console.log("Nessun dato Token valido da analizzare.");

    const tokenMap = {};
    let totBuy = 0; let totSell = 0;

    datiPuliti.sort((a, b) => a.timestamp - b.timestamp);

    datiPuliti.forEach(tx => {
        if (!tokenMap[tx.mint]) tokenMap[tx.mint] = { acquisti: 0, vendite: 0, sizeBuy: [], sizeSell: [], primoBuy: null, ultimoSell: null };
        
        if (tx.tipo === 'BUY') {
            totBuy++;
            tokenMap[tx.mint].acquisti++;
            tokenMap[tx.mint].sizeBuy.push(tx.differenzaToken);
            if (!tokenMap[tx.mint].primoBuy) tokenMap[tx.mint].primoBuy = tx.timestamp;
        } else {
            totSell++;
            tokenMap[tx.mint].vendite++;
            tokenMap[tx.mint].sizeSell.push(tx.differenzaToken);
            tokenMap[tx.mint].ultimoSell = tx.timestamp;
        }
    });

    console.log(`🟢 Operazioni BUY Totali: ${totBuy} | 🔴 SELL Totali: ${totSell}`);

    let tradeChiusi = 0;
    let tempiHold = [];
    let bagHolders = 0; // Monete comprate e mai più vendute (Perdite/Rug)

    const preferiti = Object.entries(tokenMap)
        .map(([mint, dati]) => {
            if (dati.primoBuy && dati.ultimoSell && dati.ultimoSell > dati.primoBuy) {
                tradeChiusi++;
                tempiHold.push((dati.ultimoSell - dati.primoBuy) / 1000); // In secondi
            }
            if (dati.acquisti > 0 && dati.vendite === 0) bagHolders++;

            return { mint, dati, scambiTotali: dati.acquisti + dati.vendite };
        })
        .sort((a, b) => b.scambiTotali - a.scambiTotali);

    const avgHold = tempiHold.length > 0 ? (tempiHold.reduce((a,b)=>a+b,0) / tempiHold.length) : 0;
    const maxHold = tempiHold.length > 0 ? Math.max(...tempiHold) : 0;
    const minHold = tempiHold.length > 0 ? Math.min(...tempiHold) : 0;
    
    const totaleTokenToccati = preferiti.length;
    const winRate = totaleTokenToccati > 0 ? ((totaleTokenToccati - bagHolders) / totaleTokenToccati) * 100 : 0;

    console.log(`\n⏱️ TEMPISTICHE DI ESECUZIONE (Hold Time):`);
    console.log(`   ➤ Medio: ${avgHold.toFixed(1)} secondi`);
    console.log(`   ➤ Minimo (Panico): ${minHold.toFixed(1)} sec | Massimo (Pazienza): ${maxHold.toFixed(1)} sec`);
    
    console.log(`\n🎯 METRICHE DI SUCCESSO (Win Rate):`);
    console.log(`   ➤ Token scambiati in totale: ${totaleTokenToccati}`);
    console.log(`   ➤ Trade lasciati a morire (Rug Pull mangiati): ${bagHolders}`);
    console.log(`   ➤ Win Rate Sicurezza: ${winRate.toFixed(1)}%`);

    console.log(`\n🏆 TOP 3 TOKEN MANIPOLATI:`);
    preferiti.slice(0, 3).forEach((t, i) => {
        const avgBuy = t.dati.sizeBuy.length > 0 ? (t.dati.sizeBuy.reduce((a,b)=>a+b,0) / t.dati.sizeBuy.length) : 0;
        const avgSell = t.dati.sizeSell.length > 0 ? (t.dati.sizeSell.reduce((a,b)=>a+b,0) / t.dati.sizeSell.length) : 0;
        let scaricoRatio = (avgBuy > 0 && avgSell > 0) ? (avgSell / avgBuy) * 100 : 0;

        console.log(`  🪙 ${i+1}. ${t.mint.substring(0,8)}...`);
        console.log(`     Buy: ${t.dati.acquisti} | Sell: ${t.dati.vendite}`);
        if (scaricoRatio > 0 && scaricoRatio < 90) {
            console.log(`     🤖 Modus Operandi: Scarica il ${scaricoRatio.toFixed(1)}% della Size a ogni colpo.`);
        } else {
            console.log(`     💥 Modus Operandi: Compra in blocco e Vende in blocco (Cecchino).`);
        }
    });
}

// =====================================================================
// INTERRUTTORE DI ACCENSIONE (Questo mancava!)
// =====================================================================
scaricaEAnalizza();