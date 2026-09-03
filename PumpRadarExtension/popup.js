document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');
    // ==========================================
    // 🔍 CONTROLLO ZOOM LENTE DI INGRANDIMENTO
    // ==========================================
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    
    // Recupera lo zoom salvato (di default 1)
    let currentZoom = parseFloat(localStorage.getItem('userZoom')) || 1;
    document.body.style.zoom = currentZoom;

    if (btnZoomIn && btnZoomOut) {
        btnZoomIn.addEventListener('click', () => {
            if (currentZoom < 1.5) { // Limite massimo di zoom (150%)
                currentZoom += 0.1;
                document.body.style.zoom = currentZoom;
                localStorage.setItem('userZoom', currentZoom); // Salva la preferenza
            }
        });

        btnZoomOut.addEventListener('click', () => {
            if (currentZoom > 0.7) { // Limite minimo di zoom (70%)
                currentZoom -= 0.1;
                document.body.style.zoom = currentZoom;
                localStorage.setItem('userZoom', currentZoom); // Salva la preferenza
            }
        });
    }
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
            
            // 2. Riavvia la chiamata al server in background per RICONNETTERE IL WEBSOCKET
            fetch(`https://help-trading-production.up.railway.app/api/scan/${memoria.ultimoTokenScansionato}`)
            .then(res => res.json()).then(data => {
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
        if (!tabs || tabs.length === 0) return;
        
        const url = tabs[0].url;
        
        // 🔥 FIX SCHERMO INTERO: Se non siamo su pump.fun, carichiamo i dati dalla memoria
        if (!url || (!url.includes('pump.fun') && !url.includes('dexscreener'))) {
            chrome.storage.local.get(['ultimoTokenScansionato', 'ultimoRisultatoScan'], (memoria) => {
                if (memoria.ultimoTokenScansionato && memoria.ultimoRisultatoScan) {
                    disegnaInterfacciaRadar(memoria.ultimoTokenScansionato, memoria.ultimoRisultatoScan);
                } else {
                    contentDiv.innerHTML = '<p style="color:#aaa; text-align:center;">Apri un token su Pump.fun per iniziare.</p>';
                }
            });
            return;
        }

        // Se siamo su Pump.fun, estraiamo il token dall'URL
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
            const tokenMint = pathParts[pathParts.length - 1];

            if (!tokenMint || tokenMint === 'board' || tokenMint === 'create') return;

            contentDiv.innerHTML = `<div class="token-mint">Target: ${tokenMint}</div><p style="color:#00ffcc;">⏳ Scansione in corso...</p>`;

            // Chiamata al server Cloud
            const response = await fetch(`https://help-trading-production.up.railway.app/api/scan/${tokenMint}`);
            const data = await response.json();
            
            if (data.error) {
                contentDiv.innerHTML = `<p style="color: #ff4444;">❌ Errore Backend: ${data.error}</p>`;
                return;
            }

            // Salvataggio in memoria
            chrome.storage.local.set({ ultimoTokenScansionato: tokenMint, ultimoRisultatoScan: data });

            // Disegna a schermo
            disegnaInterfacciaRadar(tokenMint, data);

        } catch (error) {
            contentDiv.innerHTML = `<p style="color: #ffaa00;">⚠️ Errore di connessione al Cloud: ${error.message}</p>`;
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
                    const response = await fetch(`https://help-trading-production.up.railway.app/api/tracker/${wallet}`);
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