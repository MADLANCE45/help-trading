document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');

    // Chiediamo a Chrome l'URL della scheda attiva
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs || tabs.length === 0) {
            contentDiv.innerHTML = '<p>❌ Errore: Impossibile leggere la scheda attiva.</p>';
            return;
        }
        
        const url = tabs[0].url;
        
        // Verifichiamo di essere su Pump.fun
        if (!url || !url.includes('pump.fun')) {
            contentDiv.innerHTML = '<p>Apri la pagina di un token su Pump.fun per usare il radar.</p>';
            return;
        }

        // Estrazione sicura del token dall'URL
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
            const tokenMint = pathParts[pathParts.length - 1];

            if (!tokenMint || tokenMint === 'board' || tokenMint === 'create') {
                contentDiv.innerHTML = '<p>Nessun token rilevato in questo URL. Entra nella pagina specifica di una coin.</p>';
                return;
            }

            contentDiv.innerHTML = `<div class="token-mint">Target: ${tokenMint}</div><p>Scansione in corso...</p>`;

            // Chiamata al server Node.js
            const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${tokenMint}`, {
                headers: {
                    "ngrok-skip-browser-warning": "true"
                }
            });
            const data = await response.json();
            
            if (data.error) {
                contentDiv.innerHTML = `<p style="color: #ff4444;">❌ Errore Backend: ${data.error}</p>`;
                return;
            }

            // Estrazione sicura dei dati (se un dato manca, mettiamo un valore di default)
            const score = data.score || 0;
            const rischio = data.rischio || "N/A";
            const dumper = data.dumperTrovati || "In sviluppo...";
            const devWallet = data.devWallet || "Sconosciuto";
            const devAge = data.devAgeDays !== undefined && data.devAgeDays !== "N/A" ? `${data.devAgeDays} giorni` : "N/A";
            
            const colorClass = score >= 50 ? 'danger' : 'safe';

            // Costruiamo la lista puntata per i log in modo dinamico
            let logHTML = "";
            if (data.dettagli && data.dettagli.length > 0) {
                logHTML = "<ul style='padding-left: 20px; font-size: 0.9em; margin-top: 5px;'>" + 
                          data.dettagli.map(log => `<li style="margin-bottom: 4px;">${log}</li>`).join("") + 
                          "</ul>";
            }

            // Stampiamo tutta l'interfaccia aggiornata in un colpo solo
            contentDiv.innerHTML = `
                <div class="token-mint">Target: ${tokenMint}</div>
                <div style="margin-bottom: 10px;"><strong>Status:</strong> <span class="${colorClass}">${rischio}</span></div>
                <div style="margin-bottom: 10px;"><strong>Rischio:</strong> <span class="score ${colorClass}">${score}/100</span></div>
                <div style="margin-bottom: 10px;"><strong>Dev Wallet:</strong> <span style="font-size: 0.8em; word-break: break-all;">${devWallet}</span></div>
                <div style="margin-bottom: 10px;"><strong>Età Wallet Dev:</strong> ${devAge}</div>
                <div style="margin-bottom: 10px;"><strong>Dumper Trovati:</strong> ${dumper}</div>
                
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #444;">
                    <strong>Dettagli Analisi:</strong>
                    ${logHTML}
                </div>
            `;
            if (data.error) {
                contentDiv.innerHTML = `<p style="color: #ff4444;">❌ Errore Backend: ${data.error}</p>`;
                return;
            }

            const score = data.score || 0;
            const rischio = data.rischio || "MOCK DATA";
            const dumper = data.dumperTrovati || "N/A";
            
            const colorClass = score >= 50 ? 'danger' : 'safe';

            contentDiv.innerHTML = `
                <div class="token-mint">Target: ${tokenMint}</div>
                <div style="margin-bottom: 10px;"><strong>Status:</strong> <span class="${colorClass}">${rischio}</span></div>
                <div style="margin-bottom: 10px;"><strong>Rischio:</strong> <span class="score ${colorClass}">${score}/100</span></div>
                <div><strong>Dumper Trovati:</strong> ${dumper}</div>
                
                </div>
            `;
        } catch (error) {
            contentDiv.innerHTML = `<p style="color: #ffaa00;">⚠️ Errore di connessione a Ngrok o lettura URL: ${error.message}</p>`;
        }
    });
});