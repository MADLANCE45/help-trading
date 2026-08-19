require('dotenv').config();
const web3 = require('@solana/web3.js');

const connection = new web3.Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`);
const PUMP_FUN_PROGRAM_ID = new web3.PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvf41xTjJ1pWnheVpump");

async function diagnostica() {
    // Usiamo il token MOTHER (Storico Pump.fun) per testare la formula matematica
    const tokenInput = "3S8qX1MsMqRbiwKg2cQyx7nis1oJCXw5xT1L5yVzpump"; 
    const mintPubkey = new web3.PublicKey(tokenInput);
    
    console.clear();
    console.log(`\n🔍 [DIAGNOSTICA] Analisi del token: ${tokenInput}\n`);

    console.log("⏳ TEST 1: Controllo Token (Velocità Massima)...");
    const tokenInfo = await connection.getAccountInfo(mintPubkey, 'confirmed');
    
    if (!tokenInfo) {
        console.log("❌ FALLITO: Helius non vede il token.");
        return;
    }
    console.log("✅ SUPERATO: Token trovato!");

    console.log("⏳ TEST 2: Calcolo l'indirizzo della Cassa Segreta...");
    const [cassaPDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("bonding-curve"), mintPubkey.toBytes()],
        PUMP_FUN_PROGRAM_ID
    );
    console.log(`🔓 Cassa calcolata: ${cassaPDA.toBase58()}`);

    // Cerchiamo la cassa forzando la lettura veloce
    const cassaInfo = await connection.getAccountInfo(cassaPDA, 'confirmed');
    
    if (!cassaInfo) {
        console.log("❌ FALLITO: La formula matematica non trova la cassa.");
    } else {
        console.log(`✅ SUPERATO: Cassa Trovata! Dimensione dati: ${cassaInfo.data.length} bytes.`);
        console.log(`🚀 LA TUA MACCHINA È PRONTA PER IL TRADING HFT!`);
    }
}

diagnostica();