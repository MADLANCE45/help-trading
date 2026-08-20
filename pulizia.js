require('dotenv').config();
const web3 = require('@solana/web3.js');
const bs58 = require('bs58');
const { TOKEN_PROGRAM_ID, createCloseAccountInstruction, createBurnInstruction } = require('@solana/spl-token');

async function puliziaEstrema() {
    const HELIUS_API = process.env.HELIUS_API_KEY;
    const connection = new web3.Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API}`, 'confirmed');
    const secretKey = bs58.decode(process.env.PRIVATE_KEY);
    const portafoglio = web3.Keypair.fromSecretKey(secretKey);

    console.log(`\n🧹 [LIVELLO 2] INIZIO SCANSIONE POLVERE SUL PORTAFOGLIO: ${portafoglio.publicKey.toBase58()}`);
    console.log(`Cerco casse bloccate con briciole (meno di 1 token)... attendi.\n`);

    try {
        const accounts = await connection.getParsedTokenAccountsByOwner(
            portafoglio.publicKey, 
            { programId: TOKEN_PROGRAM_ID }
        );
        
        let casseDaBruciare = [];

        for (const { pubkey, account } of accounts.value) {
            const uiAmount = account.data.parsed.info.tokenAmount.uiAmount;
            const rawAmount = account.data.parsed.info.tokenAmount.amount; // Serve il numero grezzo per bruciare
            const mintAddress = account.data.parsed.info.mint;

            // ⚠️ SICUREZZA: Selezioniamo solo casse con un saldo bassissimo (meno di 1 token intero)
            // Essendo meme coin, i tuoi investimenti normali sono nell'ordine di migliaia o milioni di token.
            if (uiAmount >= 0 && uiAmount < 1) {
                casseDaBruciare.push({
                    ata: new web3.PublicKey(pubkey),
                    mint: new web3.PublicKey(mintAddress),
                    rawAmount: rawAmount,
                    uiAmount: uiAmount
                });
            }
        }

        console.log(`👻 Trovate ${casseDaBruciare.length} casse bloccate dalla polvere.`);

        if (casseDaBruciare.length === 0) {
            console.log(`\n✅ Nessuna polvere trovata. Il portafoglio è davvero pulito!`);
            return;
        }

        let recuperoTotale = 0;
        console.log(`\n🔥 Avvio Incenerimento e Chiusura...`);

        // Eseguiamo un'operazione per volta per garantire stabilità con il Burn
        for (let i = 0; i < casseDaBruciare.length; i++) {
            const target = casseDaBruciare[i];
            const tx = new web3.Transaction();

            // 1. Se c'è della polvere (rawAmount > 0), aggiungiamo l'istruzione per bruciarla
            if (target.rawAmount !== "0") {
                tx.add(createBurnInstruction(
                    target.ata,
                    target.mint,
                    portafoglio.publicKey,
                    BigInt(target.rawAmount),
                    [],
                    TOKEN_PROGRAM_ID
                ));
            }

            // 2. Istruzione per chiudere l'account a riprenderci la caparra
            tx.add(createCloseAccountInstruction(
                target.ata, 
                portafoglio.publicKey, 
                portafoglio.publicKey, 
                [], 
                TOKEN_PROGRAM_ID
            ));

            try {
                process.stdout.write(`⏳ Distruzione cassa ${i+1}/${casseDaBruciare.length} (${target.uiAmount} token)... `);
                const signature = await connection.sendTransaction(tx, [portafoglio], { skipPreflight: true });
                console.log(`✅ Fatto! Recuperati ~0.002 SOL.`);
                recuperoTotale += 0.002;
                
                // Pausa di 1 secondo per non farsi bloccare da Helius (Errore 429)
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.log(`❌ Fallito: ${error.message}`);
            }
        }
        
        console.log(`\n💰 PULIZIA ESTREMA CONCLUSA! Hai recuperato un totale stimato di ${recuperoTotale.toFixed(3)} SOL.`);

    } catch (error) {
        console.error("\n❌ Errore critico durante la scansione:", error);
    }
}

puliziaEstrema();