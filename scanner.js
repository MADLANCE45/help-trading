require('dotenv').config();
const web3 = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

async function scansionaWalletPubblico(targetAddress) {
    const HELIUS_API = process.env.HELIUS_API_KEY;
    const connection = new web3.Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API}`, 'confirmed');
    const pubKey = new web3.PublicKey(targetAddress);

    console.log(`\n🔍 SCANSIONE PUBBLICA AVVIATA SUL WALLET: ${targetAddress}`);

    try {
        const accounts = await connection.getParsedTokenAccountsByOwner(
            pubKey, 
            { programId: TOKEN_PROGRAM_ID }
        );

        let casseVuote = 0;
        let cassePolvere = 0;
        let tokenValidi = 0;

        for (const { account } of accounts.value) {
            const uiAmount = account.data.parsed.info.tokenAmount.uiAmount;
            if (uiAmount === 0) casseVuote++;
            else if (uiAmount > 0 && uiAmount < 1) cassePolvere++;
            else tokenValidi++;
        }

        const casseSpazzatura = casseVuote + cassePolvere;
        const solIntrappolati = casseSpazzatura * 0.002;

        console.log(`\n📊 RISULTATI SCANSIONE:`);
        console.log(`💼 Token Attivi (Hold): ${tokenValidi}`);
        console.log(`👻 Casse Vuote (0 token): ${casseVuote}`);
        console.log(`🕸️ Casse Polvere (< 1 token): ${cassePolvere}`);
        console.log(`\n💸 SOL INTRAPPOLATI (Stima): ~${solIntrappolati.toFixed(3)} SOL`);

    } catch (error) {
        console.error("\n❌ Errore durante la scansione:", error.message);
    }
}

// L'indirizzo che mi hai dato da spiare
scansionaWalletPubblico("4vWg8DzorbrNWcdRCMF8TfMmvwbiqRS5ZsQNpprPNAux");