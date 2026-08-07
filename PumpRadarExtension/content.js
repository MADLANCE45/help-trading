document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs || tabs.length === 0) {
            contentDiv.innerHTML = '<div style="padding: 10px;">❌ Errore lettura scheda.</div>';
            return;
        }
        const url = tabs[0].url;
        if (!url || !url.includes('pump.fun')) {
            contentDiv.innerHTML = '<div style="padding: 10px;">Apri un token su Pump.fun per usare il radar.</div>';
            return;
        }

        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
            const tokenMint = pathParts[pathParts.length - 1];

            if (!tokenMint || tokenMint === 'board' || tokenMint === 'create') return;

            contentDiv.innerHTML = `<div style="padding: 10px; color: #fff;">Target: ${tokenMint}<br>⏳ Scansione on-chain...</div>`;

            const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${tokenMint}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const score = data.score || 0;
            const rischio = data.rischio || "N/A";
            const colorClass = score >= 50 ? '#ff4444' : '#00cc66';

            // --- 1. EARLY BOT SNIPER RADAR ---
            let earlySectionHTML = "";
            if (data.earlyRadar) {
                const er = data.earlyRadar;
                const isHighVolume = er.potenzialeVolume.includes("MOLTO ALTO");
                const badgeColor = isHighVolume ? '#00ffcc' : '#ffaa00';

                earlySectionHTML = `
                    <div style="background: #121820; border: 1px solid ${badgeColor}; padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 0.75em; font-weight: bold; color: ${badgeColor}; text-transform: uppercase;">⚡ Bot Volume (2k MC)</span>
                            <span style="background: ${badgeColor}; color: #000; padding: 2px 6px; font-size: 0.65em; font-weight: bold; border-radius: 3px;">${er.potenzialeVolume}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.75em; color: #ccc;">
                            <div>Slot-0 Bundle: <b style="color:${er.bundleSlot0 ? '#00ff00' : '#ff4444'};">${er.bundleSlot0 ? 'Rilevato' : 'No'}</b></div>
                            <div>Supply Bot: <b>${er.supplyBot}%</b></div>
                        </div>
                        ${er.masterWalletFull && er.masterWalletFull !== "Nessuno" ? `
                        <div style="font-size: 0.7em; color: #aaa; margin-top: 8px; border-top: 1px dashed #333; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                            <div title="${er.masterWalletFull}">🔗 Funder: <b style="color:#00aaff;">${er.masterWallet}</b></div>
                            <div style="display: flex; gap: 5px;">
                                <button class="copy-master-btn" data-wallet="${er.masterWalletFull}" style="background:#222; border:1px solid #444; color:#fff; border-radius:3px; cursor:pointer; padding: 2px 6px;" title="Copia Indirizzo">📋</button>
                                <button class="track-master-btn" data-wallet="${er.masterWalletFull}" style="background:#00aaff; border:none; color:#000; border-radius:3px; cursor:pointer; font-weight:bold; padding: 2px 8px;" title="Aggiungi al Tracker">Traccia</button>
                            </div>
                        </div>` : ''}
                    </div>
                `;
            }

            // --- 2. LOG STRATEGICI ---
            let logHTML = "";
            if (data.dettagli && data.dettagli.length > 0) {
                logHTML = "<div style='display: flex; flex-direction: column; gap: 6px; font-size: 0.85em;'>" + 
                          data.dettagli.map(log => {
                              let bColor = log.includes('✅') ? '#00cc66' : log.includes('🛑') ? '#ff4444' : '#00aaff';
                              return `<div style="background:#1a1a24; padding:8px; border-radius: 4px; border-left:3px solid ${bColor};">${log}</div>`;
                          }).join("") + "</div>";
            }

            // --- 3. GRAFICO BUNDLE ---
            let graficoHTML = "";
            if (data.graficoAttivo && data.datiGrafico) {
                const dg = data.datiGrafico;
                graficoHTML = `
                    <div style="background: #111; padding: 12px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #333;">
                        <div style="font-size: 0.8em; color: #00ffcc; margin-bottom: 15px; text-transform: uppercase; text-align: center; font-weight: bold;">📊 Traiettoria Bundle</div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.65em; color: #ccc; text-align: center; position: relative;">
                            <div style="position: absolute; top: 6px; left: 10%; right: 10%; height: 2px; background: #444; z-index: 1;"></div>
                            <div style="z-index: 2; width: 25%;">
                                <div style="background: #222; border: 2px solid #555; width: 12px; height: 12px; border-radius: 50%; margin: 0 auto 4px auto;"></div>
                                <div>Accumulo<br><b style="color:#aaa;">$${dg.ingressoLoro}</b></div>
                            </div>
                            <div style="z-index: 2; width: 25%;">
                                <div style="background: #00cc66; border: 2px solid #00ffcc; width: 14px; height: 14px; border-radius: 50%; margin: -1px auto 4px auto; box-shadow: 0 0 6px #00cc66;"></div>
                                <div style="color:#00ffcc; font-weight:bold;">USCITA<br>$${dg.tuaUscita}</div>
                            </div>
                            <div style="z-index: 2; width: 25%;">
                                <div style="background: #ff4444; border: 2px solid #ff0000; width: 12px; height: 12px; border-radius: 50%; margin: 0 auto 4px auto;"></div>
                                <div style="color:#ff4444;">Dump<br>$${dg.loroDump}</div>
                            </div>
                            <div style="z-index: 2; width: 25%;">
                                <div style="background: #222; border: 2px solid #555; width: 12px; height: 12px; border-radius: 50%; margin: 0 auto 4px auto;"></div>
                                <div>Crollo<br><b style="color:#aaa;">$${dg.crollo}</b></div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // --- 4. CALCOLATORE PROFITTI ---
            let simulatoreHTML = "";
            if (data.tradeValido) {
                const targetK = data.targetMC ? (data.targetMC / 1000).toFixed(1) : "??";
                simulatoreHTML = `
                    <div style="background: #111; padding: 12px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #333; font-size: 0.85em;">
                        <div style="color: #ccc; margin-bottom: 12px; font-weight: bold; text-align: center;">💸 Calcolatore Profitti (Target: ${targetK}k)</div>
                        <div style="display: flex; gap: 8px; margin-bottom: 10px; align-items: center; justify-content: center;">
                            <span>Investi:</span>
                            <input type="number" id="sim-input" value="0.1" step="0.01" min="0.01" style="width: 65px; padding: 4px; background: #222; border: 1px solid #00ffcc; border-radius: 4px; color: #00ffcc; outline: none; text-align: center; font-weight: bold;">
                            <span>SOL <span style="font-size:0.8em; color:#888;">($<span id="sim-usd-cost">...</span>)</span></span>
                        </div>
                        <div style="background: #1a1a24; padding: 8px; border-radius: 4px; border-left: 3px solid #00ffcc;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span>Ricavo Uscita:</span>
                                <b style="color: #00ffcc;"><span id="sim-gross-sol">...</span> SOL</b>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #444; padding-top: 4px;">
                                <span>Profitto Netto:</span>
                                <b style="color: #00ff00;">+<span id="sim-net-sol">...</span> SOL <span style="font-size:0.8em;">(+$<span id="sim-net-usd">...</span>)</span></b>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                simulatoreHTML = `
                    <div style="background: #111; padding: 12px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #333; text-align: center; font-size: 0.85em;">
                        <div style="color: #ccc; margin-bottom: 6px; font-weight: bold;">💸 Calcolatore Profitti</div>
                        <div style="color: #ff4444; font-weight:bold;">${data.simulatoreTesto || "⛔ Operazione bruciata."}</div>
                    </div>
                `;
            }

            // --- ASSEMBLAGGIO FINALE 320px ---
            contentDiv.innerHTML = `
                <div style="width: 320px; box-sizing: border-box; color: #fff; text-align: left; font-family: sans-serif;">
                    <div style="font-family: monospace; color: #00ffcc; font-size: 0.8em; margin-bottom: 12px;">🎯 ${tokenMint.substring(0,25)}...</div>
                    
                    <div style="display: flex; justify-content: space-between; background: #222; padding: 12px; border-radius: 6px; border-left: 4px solid ${colorClass}; margin-bottom: 12px;">
                        <div>
                            <div style="font-size:0.7em;color:#aaa; margin-bottom:4px;">Status</div>
                            <div style="font-weight:bold; color:${colorClass};">${rischio}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.7em;color:#aaa; margin-bottom:4px;">Rischio</div>
                            <b style="font-size:1.2em; color:${colorClass};">${score}/100</b>
                        </div>
                    </div>

                    ${earlySectionHTML}
                    ${graficoHTML}
                    ${simulatoreHTML}

                    <div style="background:#111; padding:10px; border-radius: 6px; border:1px solid #333; margin-bottom: 15px;">
                        ${logHTML}
                    </div>

                    <div style="border-top: 1px solid #444; padding-top: 15px;">
                        <h4 style="margin: 0 0 12px 0; color: #00ffcc; font-size: 1.1em;">💼 Rubrica Smart Money</h4>
                        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                            <input type="text" id="new-wallet-input" placeholder="Incolla wallet..." style="width: 70%; padding: 8px; background: #222; border: 1px solid #444; border-radius: 4px; color: white; outline: none; box-sizing: border-box;">
                            <button id="add-wallet-btn" style="width: 30%; padding: 8px; background: #00ffcc; color: black; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; box-sizing: border-box;">Salva</button>
                        </div>
                        <div id="tracked-wallets-list" style="font-size: 11px; max-height: 200px; overflow-y: auto; padding-right: 4px;"></div>
                    </div>
                </div>
            `;

            // ATTIVAZIONE EVENTI CALCOLATORE
            if (data.tradeValido) {
                const inputEl = document.getElementById('sim-input');
                const costUsdEl = document.getElementById('sim-usd-cost');
                const grossSolEl = document.getElementById('sim-gross-sol');
                const netSolEl = document.getElementById('sim-net-sol');
                const netUsdEl = document.getElementById('sim-net-usd');
                
                const mult = data.moltiplicatore || 0;
                const solPrice = data.prezzoSol || 150;

                function ricalcola() {
                    let val = parseFloat(inputEl.value);
                    if(isNaN(val) || val < 0) val = 0;
                    
                    const costUsd = (val * solPrice).toFixed(2);
                    const grossSol = (val * mult).toFixed(3);
                    const netSol = (grossSol - val).toFixed(3);
                    const netUsd = (netSol * solPrice).toFixed(2);
                    
                    if (costUsdEl) costUsdEl.innerText = costUsd;
                    if (grossSolEl) grossSolEl.innerText = grossSol;
                    if (netSolEl) netSolEl.innerText = netSol;
                    if (netUsdEl) netUsdEl.innerText = netUsd;
                }

                if (inputEl) {
                    inputEl.addEventListener('input', ricalcola);
                    ricalcola();
                }
            }

            inizializzaTracker();

        } catch (error) {
            contentDiv.innerHTML = `<div style="width: 320px; color: #ffaa00; padding: 10px;">⚠️ Errore API: ${error.message}</div>`;
        }
    });

    // --- FUNZIONI TRACKER ---
    function inizializzaTracker() {
        const addBtn = contentDiv.querySelector('#add-wallet-btn');
        const inputField = contentDiv.querySelector('#new-wallet-input');
        if (!addBtn || !inputField) return;
        
        addBtn.addEventListener('click', () => {
            const newWallet = inputField.value.trim();
            if (newWallet.length > 30) { 
                chrome.storage.local.get(['trackedWallets'], function(result) {
                    let wallets = result.trackedWallets || [];
                    if (!wallets.includes(newWallet)) {
                        wallets.push(newWallet);
                        chrome.storage.local.set({ trackedWallets: wallets }, () => {
                            inputField.value = ''; loadSavedWallets(); 
                        });
                    }
                });
            }
        });

        // Gestione di TUTTI i click sui bottoni generati dinamicamente
        contentDiv.addEventListener('click', (e) => {
            
            // Bottone COPIA Master Wallet
            if (e.target.closest('.copy-master-btn')) {
                const btn = e.target.closest('.copy-master-btn');
                const wallet = btn.getAttribute('data-wallet');
                navigator.clipboard.writeText(wallet).then(() => {
                    btn.innerText = "✅";
                    setTimeout(() => btn.innerText = "📋", 2000);
                });
            }

            // Bottone TRACCIA Master Wallet
            if (e.target.closest('.track-master-btn')) {
                const btn = e.target.closest('.track-master-btn');
                const wallet = btn.getAttribute('data-wallet');
                const inputF = document.getElementById('new-wallet-input');
                const addB = document.getElementById('add-wallet-btn');
                if(inputF && addB) {
                    inputF.value = wallet;
                    addB.click(); 
                    btn.innerText = "Fatto!";
                }
            }

            // Bottone Rinomina Wallet
            if (e.target.classList.contains('edit-name-btn')) {
                const wallet = e.target.getAttribute('data-wallet');
                const nuovoNome = prompt("Inserisci nome (lascia vuoto per resettare):");
                if (nuovoNome !== null) {
                    chrome.storage.local.get(['walletNames'], (res) => {
                        let names = res.walletNames || {};
                        if (nuovoNome.trim() === "") delete names[wallet];
                        else names[wallet] = nuovoNome.trim();
                        chrome.storage.local.set({ walletNames: names }, () => loadSavedWallets());
                    });
                }
            }

            // Bottone Elimina Wallet
            if (e.target.classList.contains('delete-wallet-btn')) {
                const wallet = e.target.getAttribute('data-wallet');
                if(confirm("Smettere di tracciare questo wallet?")) {
                    chrome.storage.local.get(['trackedWallets', 'walletNames'], (res) => {
                        let wallets = res.trackedWallets || [];
                        let names = res.walletNames || {};
                        wallets = wallets.filter(w => w !== wallet);
                        delete names[wallet];
                        chrome.storage.local.set({ trackedWallets: wallets, walletNames: names }, () => loadSavedWallets());
                    });
                }
            }
        });

        loadSavedWallets();
    }

    function loadSavedWallets() {
        const listContainer = contentDiv.querySelector('#tracked-wallets-list');
        if (!listContainer) return; 

        chrome.storage.local.get(['trackedWallets', 'walletNames'], function(result) {
            const wallets = result.trackedWallets || [];
            const walletNames = result.walletNames || {};
            listContainer.innerHTML = ''; 

            wallets.forEach(async (wallet) => {
                const walletItem = document.createElement('div');
                walletItem.style.cssText = "background: #1e1e24; border: 1px solid #333; border-radius: 4px; padding: 10px; margin-bottom: 8px;";
                walletItem.innerHTML = `<span style="color:#00ffcc;">⏳ Fetch ${wallet.substring(0, 6)}...</span>`;
                listContainer.appendChild(walletItem);

                const displayName = walletNames[wallet] ? walletNames[wallet] : `${wallet.substring(0, 4)}...${wallet.slice(-4)}`;

                try {
                    const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/tracker/${wallet}`, {
                        headers: { "ngrok-skip-browser-warning": "true" }
                    });
                    const data = await response.json();
                    const pnlVal = parseFloat(data.pnlOggi);
                    const pnlColor = pnlVal >= 0 ? '#00ff00' : '#ff4444';
                    
                    walletItem.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #444; padding-bottom:6px; margin-bottom:6px;">
                            <strong style="color:#00aaff; font-size:1.1em; max-width:65%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${wallet}">
                                ${displayName}
                            </strong>
                            <div style="display:flex; gap:8px;">
                                <span class="edit-name-btn" data-wallet="${wallet}" style="cursor:pointer;" title="Rinomina">✏️</span>
                                <span class="delete-wallet-btn" data-wallet="${wallet}" style="cursor:pointer;" title="Elimina">🗑️</span>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin: 6px 0;">
                            <div>WinRate: <b style="color:${parseFloat(data.winRate)>50?'#00ff00':'#ff4444'};">${data.winRate}</b></div>
                            <div>ROI: <b>${data.rendimentoX}</b></div>
                        </div>
                        <div style="background:#222; padding:6px; border-radius: 4px; border-left:3px solid ${pnlColor}; display:flex; justify-content:space-between;">
                            <span>Oggi: <b>${data.depositoOggi}</b></span>
                            <span style="color:${pnlColor}">PNL: <b>${pnlVal > 0 ? '+' : ''}${data.pnlOggi}</b></span>
                        </div>
                    `;
                } catch(e) {
                    walletItem.innerHTML = `<div style="display:flex; justify-content:space-between;"><span style="color:#ff4444;">❌ Timeout ${displayName}</span><span class="delete-wallet-btn" data-wallet="${wallet}" style="cursor:pointer;">🗑️</span></div>`;
                }
            });
        });
    }
});