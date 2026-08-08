document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');

    function avviaRadar() {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (!tabs || tabs.length === 0) {
                contentDiv.innerHTML = '<div style="padding: 10px;">❌ Errore lettura scheda.</div>';
                return;
            }
            const url = tabs[0].url;
            
            try {
                // Intelligenza RegEx: Cerca automaticamente un indirizzo Solana valido (32-44 caratteri base58) nell'URL
                const matchToken = url.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
                
                if (!matchToken) {
                    contentDiv.innerHTML = `
                        <div style="padding: 20px; text-align:center; color:#ffaa00;">
                            ⚠️ <b>Nessun Token Rilevato</b><br><br>
                            Apri la pagina di una moneta su Pump.fun o Axiom Trade per analizzarla.
                        </div>`;
                    return;
                }

                const tokenMint = matchToken[0];

                contentDiv.innerHTML = `
                    <div style="padding: 20px; color: #00ffcc; text-align: center; font-family: monospace;">
                        <div style="font-size: 2em; margin-bottom: 10px;">📡</div>
                        ⏳ Scansione on-chain...<br>
                        <span style="font-size: 0.7em; color: #888;">${tokenMint.substring(0,12)}...</span>
                    </div>`;

                const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${tokenMint}`, {
                    headers: { "ngrok-skip-browser-warning": "true" }
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);

                const score = data.score || 0;
                const rischio = data.rischio || "N/A";
                const colorClass = score >= 70 ? '#ff4d4d' : (score >= 40 ? '#ffaa00' : '#00e676');

                // 1. EARLY BOT SNIPER
                let earlySectionHTML = "";
                if (data.earlyRadar) {
                    const er = data.earlyRadar;
                    const isHighVolume = er.potenzialeVolume.includes("ALTO");
                    const badgeColor = isHighVolume ? '#ff4d4d' : '#00ffcc';

                    earlySectionHTML = `
                        <div style="background: #12151f; border: 1px solid ${badgeColor}; padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="font-size: 0.75em; font-weight: bold; color: ${badgeColor}; text-transform: uppercase;">⚡ Bot Volume</span>
                                <span style="background: ${badgeColor}; color: #000; padding: 2px 6px; font-size: 0.65em; font-weight: bold; border-radius: 3px;">${er.potenzialeVolume}</span>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.75em; color: #ccc;">
                                <div>Slot-0 Bundle: <b style="color:${er.bundleSlot0 ? '#ff4d4d' : '#00e676'};">${er.bundleSlot0 ? 'Rilevato' : 'No'}</b></div>
                                <div>Supply Bot: <b style="color:${er.supplyBot >= 20 ? '#ff4d4d' : '#00e676'}">${er.supplyBot}%</b></div>
                            </div>
                            ${er.masterWalletFull && er.masterWalletFull !== "Nessuno" ? `
                            <div style="font-size: 0.7em; color: #aaa; margin-top: 8px; border-top: 1px dashed #333; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                                <div title="${er.masterWalletFull}">🔗 Funder: <b style="color:#00aaff;">${er.masterWallet}</b></div>
                                <div style="display: flex; gap: 5px;">
                                    <a href="https://solscan.io/account/${er.masterWalletFull}" target="_blank" style="background:#8a2be2; border:none; color:#fff; border-radius:3px; cursor:pointer; font-weight:bold; padding: 2px 6px; text-decoration:none; font-size:11px;" title="Apri su Solscan">Solscan</a>
                                    <button class="copy-master-btn" data-wallet="${er.masterWalletFull}" style="background:#222; border:1px solid #444; color:#fff; border-radius:3px; cursor:pointer; padding: 2px 6px;">📋</button>
                                    <button class="track-master-btn" data-wallet="${er.masterWalletFull}" style="background:#00aaff; border:none; color:#000; border-radius:3px; cursor:pointer; font-weight:bold; padding: 2px 8px;">Traccia</button>
                                </div>
                            </div>` : ''}
                        </div>
                    `;
                }

                // 2. LOG STRATEGICI
                let logHTML = "";
                if (data.dettagli && data.dettagli.length > 0) {
                    logHTML = "<div style='display: flex; flex-direction: column; gap: 6px; font-size: 0.85em;'>" + 
                              data.dettagli.map(log => {
                                  let bColor = log.includes('✅') ? '#00e676' : log.includes('🛑') || log.includes('🚨') ? '#ff4d4d' : '#00aaff';
                                  return `<div style="background:#161821; padding:8px; border-radius: 4px; border-left:3px solid ${bColor};">${log}</div>`;
                              }).join("") + "</div>";
                }

                // 3. CALCOLATORE PROFITTI
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
                        <div style="background: #1a1515; padding: 12px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #ff4d4d; text-align: center; font-size: 0.85em;">
                            <div style="color: #ff4d4d; margin-bottom: 6px; font-weight: bold;">⛔ TRADE BLOCCATO</div>
                            <div style="color: #ccc;">${data.simulatoreTesto || "Rischio troppo elevato per entrare."}</div>
                        </div>
                    `;
                }

                // --- ASSEMBLAGGIO FINALE CON TAB IN STILE PHANTOM ---
                contentDiv.innerHTML = `
                    <div style="width: 320px; height: 540px; display: flex; flex-direction: column; background: #0a0c10; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; position: relative; margin: -8px;">
                        
                        <!-- 🌐 HEADER FISSO: SOLANA INDEX -->
                        <div style="background: linear-gradient(90deg, #12151f, #1a1c29); border-bottom: 2px solid ${data.hud.color}; padding: 12px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; z-index: 10;">
                            <div>
                                <div style="font-size: 0.6em; color: #888; text-transform: uppercase; letter-spacing: 1px;">Solana Memecoin Index</div>
                                <div style="font-size: 1.1em; font-weight: bold; color: ${data.hud.color};">
                                    ${data.hud.icon} ${data.hud.change >= 0 ? '+' : ''}${data.hud.change}% 
                                    <span style="font-size: 0.6em; color: #aaa;">Vol: $${data.hud.volume}M</span>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.6em; color: #888; text-transform: uppercase; letter-spacing: 1px;">Trend</div>
                                <div style="font-size: 0.75em; font-weight: bold; color: ${data.hud.color};">${data.hud.trend}</div>
                            </div>
                        </div>

                        <!-- 📜 AREA CONTENUTO SCORREVOLE -->
                        <div id="scroll-area" style="flex-grow: 1; overflow-y: auto; padding: 12px; padding-bottom: 20px;">
                            
                            <!-- ================================ -->
                            <!-- VIEW 1: RADAR (Attiva di default)-->
                            <!-- ================================ -->
                            <div id="view-radar">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                    <div style="font-family: monospace; color: #00ffcc; font-size: 0.85em; background: #12151f; padding: 4px 8px; border-radius: 4px; border: 1px solid #222;">🎯 ${tokenMint.substring(0,15)}...</div>
                                    <button id="btn-ricarica" style="background: #2a2d3d; border: 1px solid #444; color: #fff; font-weight: bold; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8em; transition: 0.2s;">🔄 Aggiorna</button>
                                </div>
                                
                                <div style="background: linear-gradient(145deg, #161821, #1e2130); padding: 15px; border-radius: 8px; border-left: 5px solid ${colorClass}; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <div style="font-size:0.7em; color:#aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom:4px;">Stato Sicurezza</div>
                                            <div style="font-weight:bold; font-size: 1.1em; color:${colorClass};">${rischio}</div>
                                        </div>
                                        <div style="text-align:right;">
                                            <div style="font-size:0.7em; color:#aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom:4px;">Rischio</div>
                                            <div style="font-size:1.6em; font-weight: 900; color:${colorClass};">${score}<span style="font-size: 0.5em; color: #777;">/100</span></div>
                                        </div>
                                    </div>
                                </div>

                                ${earlySectionHTML}
                                ${simulatoreHTML}

                                <div style="background:#12151f; padding:12px; border-radius: 8px; border:1px solid #2d3142; margin-bottom: 10px;">
                                    <div style="font-size: 0.7em; color: #888; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Terminale di Analisi</div>
                                    ${logHTML}
                                </div>
                            </div>

                            <!-- ================================ -->
                            <!-- VIEW 2: SMART MONEY TRACKER      -->
                            <!-- ================================ -->
                            <div id="view-tracker" style="display: none;">
                                <div style="text-align: center; margin-bottom: 15px;">
                                    <h3 style="margin: 0; color: #00ffcc; font-size: 1.2em;">💼 Smart Money</h3>
                                    <div style="font-size: 0.75em; color: #aaa;">Traccia i portafogli dei balenotteri</div>
                                </div>

                                <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                                    <input type="text" id="new-wallet-input" placeholder="Indirizzo Solana..." style="flex-grow: 1; padding: 10px; background: #12151f; border: 1px solid #2d3142; border-radius: 6px; color: white; outline: none; font-family: monospace; font-size: 0.8em;">
                                    <button id="add-wallet-btn" style="padding: 10px 15px; background: #00ffcc; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Salva</button>
                                </div>
                                <div id="tracked-wallets-list" style="font-size: 11px;"></div>
                            </div>

                        </div>

                        <!-- 📱 BOTTOM NAVIGATION BAR (Stile Phantom) -->
                        <div style="display: flex; background: #12151f; border-top: 1px solid #222; height: 55px; flex-shrink: 0; z-index: 10;">
                            <div id="tab-radar" class="nav-tab active-tab" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #00ffcc; border-top: 2px solid #00ffcc; background: rgba(0, 255, 204, 0.05);">
                                <span style="font-size: 1.2em; margin-bottom: 2px;">📡</span>
                                <span style="font-size: 0.65em; font-weight: bold; text-transform: uppercase;">Radar</span>
                            </div>
                            <div id="tab-tracker" class="nav-tab" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #777; border-top: 2px solid transparent;">
                                <span style="font-size: 1.2em; margin-bottom: 2px;">💼</span>
                                <span style="font-size: 0.65em; font-weight: bold; text-transform: uppercase;">Tracker</span>
                            </div>
                        </div>
                    </div>
                `;

                // --- LOGICA DI CAMBIO TAB ---
                const tabRadar = document.getElementById('tab-radar');
                const tabTracker = document.getElementById('tab-tracker');
                const viewRadar = document.getElementById('view-radar');
                const viewTracker = document.getElementById('view-tracker');

                function switchTab(activeId) {
                    if (activeId === 'radar') {
                        viewRadar.style.display = 'block';
                        viewTracker.style.display = 'none';
                        tabRadar.style.color = '#00ffcc';
                        tabRadar.style.borderTop = '2px solid #00ffcc';
                        tabRadar.style.background = 'rgba(0, 255, 204, 0.05)';
                        tabTracker.style.color = '#777';
                        tabTracker.style.borderTop = '2px solid transparent';
                        tabTracker.style.background = 'transparent';
                    } else {
                        viewRadar.style.display = 'none';
                        viewTracker.style.display = 'block';
                        tabRadar.style.color = '#777';
                        tabRadar.style.borderTop = '2px solid transparent';
                        tabRadar.style.background = 'transparent';
                        tabTracker.style.color = '#00ffcc';
                        tabTracker.style.borderTop = '2px solid #00ffcc';
                        tabTracker.style.background = 'rgba(0, 255, 204, 0.05)';
                    }
                }

                tabRadar.addEventListener('click', () => switchTab('radar'));
                tabTracker.addEventListener('click', () => switchTab('tracker'));
                
                document.getElementById('btn-ricarica').addEventListener('click', avviaRadar);

                // --- LOGICA CALCOLATORE ---
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

                // --- ATTIVA TRACKER ---
                inizializzaTracker();

            } catch (error) {
                contentDiv.innerHTML = `<div style="padding: 20px; text-align:center; color:#ff4d4d;">⚠️ Errore API: ${error.message}</div>`;
            }
        });
    }

    avviaRadar();

    // --- FUNZIONI TRACKER ---
    function inizializzaTracker() {
        const addBtn = document.getElementById('add-wallet-btn');
        const inputField = document.getElementById('new-wallet-input');
        if (!addBtn || !inputField) return;
        
        addBtn.addEventListener('click', () => {
            const newWallet = inputField.value.trim();
            if (newWallet.length >= 32 && newWallet.length <= 44) { 
                chrome.storage.local.get(['trackedWallets'], function(result) {
                    let wallets = result.trackedWallets || [];
                    if (!wallets.includes(newWallet)) {
                        wallets.push(newWallet);
                        chrome.storage.local.set({ trackedWallets: wallets }, () => {
                            inputField.value = ''; 
                            loadSavedWallets(); 
                        });
                    }
                });
            } else {
                alert("⚠️ Inserisci un Indirizzo Solana valido (43-44 caratteri)!");
            }
        });

        document.getElementById('content').addEventListener('click', (e) => {
            if (e.target.closest('.copy-master-btn')) {
                const btn = e.target.closest('.copy-master-btn');
                navigator.clipboard.writeText(btn.getAttribute('data-wallet')).then(() => {
                    btn.innerText = "✅"; setTimeout(() => btn.innerText = "📋", 2000);
                });
            }
            if (e.target.closest('.track-master-btn')) {
                const btn = e.target.closest('.track-master-btn');
                const inputF = document.getElementById('new-wallet-input');
                const addB = document.getElementById('add-wallet-btn');
                if(inputF && addB) {
                    inputF.value = btn.getAttribute('data-wallet');
                    document.getElementById('tab-tracker').click(); // Passa al tab tracker in automatico!
                    addB.click(); 
                    btn.innerText = "Fatto!";
                }
            }
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

    async function loadSavedWallets() {
        const listContainer = document.getElementById('tracked-wallets-list');
        if (!listContainer) return; 

        chrome.storage.local.get(['trackedWallets', 'walletNames'], async function(result) {
            const wallets = result.trackedWallets || [];
            const walletNames = result.walletNames || {};
            listContainer.innerHTML = ''; 

            const walletElements = {};
            for (const wallet of wallets) {
                const walletItem = document.createElement('div');
                walletItem.style.cssText = "background: linear-gradient(145deg, #161821, #1a1c29); border: 1px solid #2d3142; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.4);";
                walletItem.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:#00ffcc; font-size: 0.85em;">⏳ Connessione: ${wallet.substring(0, 6)}...</span>
                        <button class="delete-wallet-btn" data-wallet="${wallet}" style="background:#362424; border:1px solid #583a3a; color:#ff4d4d; border-radius:4px; padding:3px 6px; cursor:pointer;">🗑️</button>
                    </div>`;
                listContainer.appendChild(walletItem);
                walletElements[wallet] = walletItem; 
            }

            for (const wallet of wallets) {
                const walletItem = walletElements[wallet];
                const displayName = walletNames[wallet] || `${wallet.substring(0, 4)}...${wallet.slice(-4)}`;

                try {
                    const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/tracker/${wallet}`, {
                        headers: { "ngrok-skip-browser-warning": "true" }
                    });
                    
                    const data = await response.json();
                    if (!response.ok || data.error) throw new Error(data.error || "Errore Server");

                    const cal = data.calendario || { oggi: { pnl: 0, win: '0/0' }, ieri: { pnl: 0, win: '0/0' }, totale: { pnl: 0, winRateGlobale: '0%' } };
                    const pnlOggiVal = parseFloat(cal.oggi.pnl) || 0;
                    const colOggi = pnlOggiVal >= 0 ? '#00e676' : '#ff4d4d';
                    const pnlIeriVal = parseFloat(cal.ieri.pnl) || 0;
                    const colIeri = pnlIeriVal >= 0 ? '#00e676' : '#ff4d4d';
                    const pnlTotVal = parseFloat(cal.totale.pnl) || 0;
                    const colTot = pnlTotVal >= 0 ? '#00aaff' : '#ff4d4d';

                    walletItem.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #2d3142; padding-bottom:8px; margin-bottom:10px;">
                            <strong style="color:#00e6e6; font-size:1.05em; max-width:40%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${wallet}">${displayName}</strong>
                            <div style="background:#0a0c10; border:1px solid #00ffcc; border-radius:4px; padding:3px 6px; color:#00ffcc; font-size:0.75em; font-weight:bold; box-shadow: 0 0 5px rgba(0,255,204,0.2);">💰 ${data.balance || '0.00'} SOL</div>
                            <div style="display:flex; gap:4px;">
                                <button class="edit-name-btn" data-wallet="${wallet}" style="background:#242736; border:1px solid #3a3f58; color:#fff; border-radius:4px; padding:3px 6px; cursor:pointer; font-size:0.8em;" title="Rinomina">✏️</button>
                                <button class="delete-wallet-btn" data-wallet="${wallet}" style="background:#362424; border:1px solid #583a3a; color:#ff4d4d; border-radius:4px; padding:3px 6px; cursor:pointer; font-size:0.8em;" title="Elimina">🗑️</button>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; text-align: center;">
                            <div style="background:#11121a; border-radius:6px; padding:6px; border-top:2px solid ${colOggi};">
                                <div style="color:#777; font-size:0.7em; letter-spacing:1px; margin-bottom:4px;">OGGI</div>
                                <div style="color:${colOggi}; font-weight:bold; font-size:1em;">${pnlOggiVal >= 0 ? '+' : ''}${cal.oggi.pnl}</div>
                                <div style="color:#555; font-size:0.75em; margin-top:3px;">Win: ${cal.oggi.win}</div>
                            </div>
                            <div style="background:#11121a; border-radius:6px; padding:6px; border-top:2px solid ${colIeri};">
                                <div style="color:#777; font-size:0.7em; letter-spacing:1px; margin-bottom:4px;">IERI</div>
                                <div style="color:${colIeri}; font-weight:bold; font-size:1em;">${pnlIeriVal >= 0 ? '+' : ''}${cal.ieri.pnl}</div>
                                <div style="color:#555; font-size:0.75em; margin-top:3px;">Win: ${cal.ieri.win}</div>
                            </div>
                            <div style="background:#0a0d14; border-radius:6px; padding:6px; border-top:2px solid ${colTot}; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
                                <div style="color:#00aaff; font-size:0.7em; letter-spacing:1px; margin-bottom:4px; font-weight:bold;">GLOBALE</div>
                                <div style="color:${colTot}; font-weight:bold; font-size:1em;">${pnlTotVal >= 0 ? '+' : ''}${cal.totale.pnl}</div>
                                <div style="color:#aaa; font-size:0.75em; margin-top:3px;">${cal.totale.winRateGlobale}</div>
                            </div>
                        </div>
                    `;
                } catch(e) {
                    walletItem.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#ff4d4d; font-weight:bold; font-size:0.85em;">❌ Errore Wallet: ELIMINARE</span>
                            <button class="delete-wallet-btn" data-wallet="${wallet}" style="background:#362424; border:1px solid #583a3a; color:#ff4d4d; border-radius:4px; padding:3px 6px; cursor:pointer;">🗑️</button>
                        </div>
                    `;
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        });
    }
});