document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');

    // ==========================================
    // 🛠️ FUNZIONE DI DISEGNO (Riutilizzabile)
    // ==========================================
    function disegnaInterfacciaRadar(tokenMint, data) {
        const score = data.score || 0;
        const rischio = data.rischio || "N/A";
        const dumper = data.dumperTrovati || "0";
        const devWallet = data.devWallet || "Sconosciuto";
        const devAge = data.devAgeDays !== undefined && data.devAgeDays !== "N/A" ? `${data.devAgeDays} giorni` : "N/A";
        const colorClass = score >= 50 ? 'danger' : 'safe';

        let logHTML = "";
        if (data.dettagli && data.dettagli.length > 0) {
            logHTML = "<ul style='padding-left: 20px; font-size: 0.9em; margin-top: 5px;'>" + 
                      data.dettagli.map(log => `<li style="margin-bottom: 4px;">${log}</li>`).join("") + 
                      "</ul>";
        }

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
    }

    // ==========================================
    // 💾 1. RECUPERO MEMORIA E RIATTIVAZIONE LIVE
    // ==========================================
    chrome.storage.local.get(['ultimoTokenScansionato', 'ultimoRisultatoScan'], (memoria) => {
        if (memoria.ultimoTokenScansionato) {
            console.log("Memoria ripristinata! Riattivo il Live Tape...");
            
            // 1. Ridisegna istantaneamente l'interfaccia vecchia senza far aspettare l'utente
            if (memoria.ultimoRisultatoScan) {
                disegnaInterfacciaRadar(memoria.ultimoTokenScansionato, memoria.ultimoRisultatoScan);
            }
            
            // 2. Riavvia la chiamata al server in background per RICONNETTERE IL WEBSOCKET e far ripartire le transazioni
            fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${memoria.ultimoTokenScansionato}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            }).then(res => res.json()).then(data => {
                if (!data.error) {
                    // Aggiorna la memoria con i dati freschi
                    chrome.storage.local.set({ ultimoRisultatoScan: data });
                    disegnaInterfacciaRadar(memoria.ultimoTokenScansionato, data);
                }
            }).catch(e => console.log("Errore riavvio background:", e));
        }
    });

    // ==========================================
    // 📡 2. PUMP RADAR (Analisi Moneta Live)
    // ==========================================
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs || tabs.length === 0) {
            if (!contentDiv.innerHTML.includes("Target:")) contentDiv.innerHTML = '<p>❌ Errore: Impossibile leggere la scheda attiva.</p>';
            return;
        }
        
        const url = tabs[0].url;
        if (!url || !url.includes('pump.fun')) {
            if (!contentDiv.innerHTML.includes("Target:")) contentDiv.innerHTML = '<p>Apri la pagina di un token su Pump.fun per usare il radar.</p>';
            return;
        }

        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
            const tokenMint = pathParts[pathParts.length - 1];

            if (!tokenMint || tokenMint === 'board' || tokenMint === 'create') return;

            // Se stiamo già guardando questo token dalla cache, mostriamo solo un piccolo loader invece di sbiancare tutto
            if (contentDiv.innerHTML.includes(tokenMint)) {
                contentDiv.innerHTML += `<p style="font-size: 0.8em; color: #aaa;">🔄 Aggiornamento in background...</p>`;
            } else {
                contentDiv.innerHTML = `<div class="token-mint">Target: ${tokenMint}</div><p>⏳ Scansione in corso...</p>`;
            }

            // Chiamata al server Node.js
            const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${tokenMint}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            const data = await response.json();
            
            if (data.error) {
                contentDiv.innerHTML = `<p style="color: #ff4444;">❌ Errore Backend: ${data.error}</p>`;
                return;
            }

            // 🔥 SALVATAGGIO IN MEMORIA AGGIUNTO! 
            chrome.storage.local.set({
                ultimoTokenScansionato: tokenMint,
                ultimoRisultatoScan: data
            });

            // Disegna i nuovi dati a schermo
            disegnaInterfacciaRadar(tokenMint, data);

        } catch (error) {
            contentDiv.innerHTML = `<p style="color: #ffaa00;">⚠️ Errore di connessione a Ngrok: ${error.message}</p>`;
        }
    });

    // ... [QUI INIZIA IL TUO CODICE DELLO SMART MONEY TRACKER: const trackerHTML = `... ]

    // --- 2. SMART MONEY TRACKER (Grafica Portafogli) ---
    const trackerHTML = `
        <hr style="border-color: #444; margin: 15px 0;">
        <div id="smart-money-tracker" style="color: white; font-family: monospace; padding: 0 10px 10px 10px;">
            <h4 style="margin: 0 0 10px 0; color: #00ffcc;">💼 Smart Money Tracker</h4>
            <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                <input type="text" id="new-wallet-input" placeholder="Incolla wallet..." style="flex: 1; padding: 5px; background: #222; border: 1px solid #444; color: white;">
                <button id="add-wallet-btn" style="padding: 5px 10px; background: #00ffcc; color: black; border: none; font-weight: bold; cursor: pointer;">Traccia</button>
            </div>
            <div id="tracked-wallets-list" style="font-size: 11px; max-height: 250px; overflow-y: auto;">
            </div>
        </div>
    `;

    // Iniezione dinamica del tracker nel DOM dell'estensione
    document.body.insertAdjacentHTML('beforeend', trackerHTML);

    const addBtn = document.getElementById('add-wallet-btn');
    const inputField = document.getElementById('new-wallet-input');
    const listContainer = document.getElementById('tracked-wallets-list');

    // Funzione che carica e renderizza i portafogli salvati
    function loadSavedWallets() {
        chrome.storage.local.get(['trackedWallets'], function(result) {
            const wallets = result.trackedWallets || [];
            listContainer.innerHTML = ''; 
            
            const oggiStr = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

            wallets.forEach(async (wallet) => {
                const walletItem = document.createElement('div');
                walletItem.style.cssText = "background: #1e1e24; border: 1px solid #333; padding: 12px; border-radius: 8px; margin-bottom: 12px; font-family: monospace;";
                walletItem.innerHTML = `<span style="color:#00ffcc;">⏳ Scansione ${wallet.substring(0, 6)}...</span>`;
                listContainer.appendChild(walletItem);

                try {
                    const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/tracker/${wallet}`, {
                        headers: {
                            "ngrok-skip-browser-warning": "true"
                        }
                    });
                    const data = await response.json();
                    
                    const pnlValue = parseFloat(data.pnlOggi);
                    const pnlColor = pnlValue >= 0 ? '#00ff00' : '#ff4444';
                    const pnlSign = pnlValue > 0 ? '+' : '';
                    const winRateColor = parseFloat(data.winRate) > 50 ? '#00ff00' : '#ff4444';

                    walletItem.innerHTML = `
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #444; padding-bottom: 6px; margin-bottom: 8px;">
                            <strong style="color: #00aaff;">${wallet.substring(0, 4)}...${wallet.slice(-4)}</strong>
                            <span style="font-size: 0.85em; color: ${data.walletMadre !== 'Sconosciuto' ? '#ffaa00' : '#888'};">
                                Madre: ${data.walletMadre !== 'Sconosciuto' ? 'Trovata ⚠️' : 'Nessuna'}
                            </span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.9em; margin-bottom: 10px;">
                            <div>🏆 Win: <b style="color: ${winRateColor};">${data.winRate}</b></div>
                            <div>🚀 ROI: <b style="color: #fff;">${data.rendimentoX}</b></div>
                            <div>🔄 Trade: <b style="color: #fff;">${data.tradeTotali}</b></div>
                            <div>👤 Stile: <b style="color: #ffaa00;">${data.classificazione}</b></div>
                        </div>

                        <div style="background: #2a2a35; border-radius: 6px; padding: 8px; font-size: 0.85em; border-left: 3px solid ${pnlColor};">
                            <div style="color: #aaa; margin-bottom: 4px;">📅 Sessione Oggi (${oggiStr})</div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>📥 Deposito: <b style="color: #fff;">${data.depositoOggi}</b></span>
                                <span>📈 PNL: <b style="color: ${pnlColor}; font-size: 1.1em;">${pnlSign}${data.pnlOggi}</b></span>
                            </div>
                            <div style="margin-top: 6px; width: 100%; height: 4px; background: #444; border-radius: 2px; overflow: hidden;">
                                <div style="width: ${parseFloat(data.winRate)}%; height: 100%; background: ${winRateColor};"></div>
                            </div>
                        </div>
                    `;
                } catch(e) {
                    walletItem.innerHTML = `<span style="color:#ff4444;">❌ Errore Server per ${wallet.substring(0, 4)}...</span>`;
                }
            });
        });
    }

    addBtn.addEventListener('click', () => {
        const newWallet = inputField.value.trim();
        if (newWallet.length > 30) { 
            chrome.storage.local.get(['trackedWallets'], function(result) {
                let wallets = result.trackedWallets || [];
                if (!wallets.includes(newWallet)) {
                    wallets.push(newWallet);
                    chrome.storage.local.set({ trackedWallets: wallets }, function() {
                        inputField.value = ''; 
                        loadSavedWallets(); 
                    });
                }
            });
        }
    });

    // Avvia la dashboard dei wallet all'apertura dell'estensione
    loadSavedWallets();
});