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
                const matchToken = url.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
                
                let tokenMint = null;
                if (matchToken) tokenMint = matchToken[0];

                if (!tokenMint || tokenMint === 'board' || tokenMint === 'create') {
                    costruisciInterfacciaBase(null, null);
                    return;
                }

                contentDiv.innerHTML = `
                    <div style="padding: 20px; color: #00ffcc; text-align: center; font-family: monospace;">
                        <div style="font-size: 2em; margin-bottom: 10px;">📡</div>
                        ⏳ Analisi on-chain in corso...<br>
                        <span style="font-size: 0.7em; color: #888;">${tokenMint.substring(0,12)}...</span>
                    </div>`;

                const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${tokenMint}`, {
                    headers: { "ngrok-skip-browser-warning": "true" }
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);

                costruisciInterfacciaBase(tokenMint, data);

            } catch (error) {
                contentDiv.innerHTML = `<div style="padding: 20px; text-align:center; color:#ff4d4d;">⚠️ Errore API: ${error.message}</div>`;
            }
        });
    }

    function costruisciInterfacciaBase(tokenMint, data) {
        if (!data) {
            data = {
                score: 0, rischio: "IN ATTESA",
                hud: { change: 0, volume: 0, trend: "N/A", color: "#444", icon: "💤" },
                tradeValido: false, simulatoreTesto: "Naviga su un token per attivare il Radar."
            };
        }

        const score = data.score || 0;
        const rischio = data.rischio || "N/A";
        const colorClass = score >= 80 ? '#ff4d4d' : (score >= 60 ? '#ffaa00' : '#00e676');

        const devWallet = data.devWallet || "Sconosciuto";
        const advice = data.advice || {
            devStatus: "In attesa di dati...",
            volumeStatus: "In attesa di dati...",
            topHoldersStatus: "In attesa di dati...",
            strategy: "In attesa di dati..."
        };

        // --- GRAFICA RILEVAMENTO BOT E TEMPO AL RUG ---
        let earlySectionHTML = "";
        if (data.earlyRadar) {
            const er = data.earlyRadar;
            const badgeColor = er.potenzialeVolume.includes("ALTO") ? '#ff4d4d' : '#00ffcc';
            earlySectionHTML = `
                <div style="background: #12151f; border: 1px solid ${badgeColor}; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 0.85em; font-weight: bold; color: ${badgeColor}; text-transform: uppercase;">🤖 Rilevamento Software Bot</span>
                        <span style="background: ${badgeColor}; color: #000; padding: 2px 6px; font-size: 0.65em; font-weight: bold; border-radius: 3px;">${er.potenzialeVolume}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8em; text-align: center;">
                        <div style="background: #1a1c29; padding: 8px; border-radius: 4px; border: 1px solid #2d3142;">
                            <span style="color:#888; display:block; margin-bottom:4px;">Acquisto Bot Istantaneo</span>
                            <b style="color:${er.bundleSlot0 ? '#ff4d4d' : '#00e676'}; font-size:1.1em;">${er.bundleSlot0 ? '⚠️ RILEVATO' : '✅ PULITO'}</b>
                        </div>
                        <div style="background: #1a1c29; padding: 8px; border-radius: 4px; border: 1px solid #2d3142;">
                            <span style="color:#888; display:block; margin-bottom:4px;">Supply ai Bot</span>
                            <b style="color:${er.supplyBot >= 20 ? '#ff4d4d' : '#00e676'}; font-size:1.1em;">${er.supplyBot}%</b>
                        </div>
                        <div style="grid-column: span 2; background: #1a1c29; padding: 8px; border-radius: 4px; border-left: 3px solid ${badgeColor}; text-align: left;">
                            <span style="color:#888; font-size:0.9em;">Tempo Stimato alla Truffa (Rug):</span><br>
                            <b style="color: ${badgeColor}; font-size:1.1em;">${advice.estimatedRugTime ? advice.estimatedRugTime : "Calcolo in corso..."}</b>
                        </div>
                    </div>
                </div>`;
        }

        let logHTML = "";
        if (data.dettagli && data.dettagli.length > 0) {
            logHTML = "<div style='display: flex; flex-direction: column; gap: 6px; font-size: 0.85em;'>" + 
                      data.dettagli.map(log => {
                          let bColor = log.includes('✅') ? '#00e676' : log.includes('🛑') || log.includes('🚨') || log.includes('🩸') ? '#ff4d4d' : '#00aaff';
                          return `<div style="background:#161821; padding:8px; border-radius: 4px; border-left:3px solid ${bColor};">${log}</div>`;
                      }).join("") + "</div>";
        }

        // --- GRAFICA CALCOLATORE E TRADE BLOCCATO ---
        let simulatoreHTML = "";
        if (data.tradeValido) {
            const targetK = data.targetMC ? (data.targetMC / 1000).toFixed(1) : "??";
            simulatoreHTML = `
                <div style="background: #111; padding: 12px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #333; font-size: 0.85em;">
                    <div style="color: #ccc; margin-bottom: 12px; font-weight: bold; text-align: center;">💸 Calcolatore Profitti (Target: ${targetK}k)</div>
                    <div style="display: flex; gap: 8px; margin-bottom: 10px; align-items: center; justify-content: center;">
                        <span>Investi:</span>
                        <input type="number" id="sim-input" value="0.1" step="0.01" style="width: 65px; padding: 4px; background: #222; border: 1px solid #00ffcc; border-radius: 4px; color: #00ffcc; text-align: center; font-weight: bold;">
                        <span>SOL <span style="font-size:0.8em; color:#888;">($<span id="sim-usd-cost">...</span>)</span></span>
                    </div>
                    <div style="background: #1a1a24; padding: 8px; border-radius: 4px; border-left: 3px solid #00ffcc;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span>Ricavo Uscita:</span><b style="color: #00ffcc;"><span id="sim-gross-sol">...</span> SOL</b>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #444; padding-top: 4px;">
                            <span>Netto:</span><b style="color: #00ff00;">+<span id="sim-net-sol">...</span> SOL (+$<span id="sim-net-usd">...</span>)</b>
                        </div>
                    </div>
                </div>`;
        } else {
            // Interfaccia aggressiva per il trade bloccato (invece del "calcolatore in pausa")
            simulatoreHTML = `
                <div style="background: #1a0f0f; padding: 15px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #ff4d4d; text-align: center;">
                    <div style="color: #ff4d4d; font-size: 1.2em; margin-bottom: 8px; font-weight: 900; letter-spacing: 1px;">⛔ SCAM RILEVATO ⛔</div>
                    <div style="color: #ffaa00; font-size: 0.85em; background: rgba(255, 77, 77, 0.1); padding: 8px; border-radius: 4px;">
                        ${data.simulatoreTesto ? data.simulatoreTesto : "I bot stanno manovrando questo token. Non investire il tuo capitale."}
                    </div>
                </div>`;
        }
        contentDiv.innerHTML = `
            <style>
                @keyframes pulseTab { 0% { background: rgba(255, 0, 127, 0.1); } 50% { background: rgba(255, 0, 127, 0.5); } 100% { background: rgba(255, 0, 127, 0.1); } }
                .spy-alert-active { animation: pulseTab 1s infinite; color: #fff !important; }
            </style>
            <div style="width: 320px; height: 540px; display: flex; flex-direction: column; background: #0a0c10; color: #fff; font-family: 'Segoe UI', sans-serif; position: relative; margin: -8px;">
                
                <div style="background: linear-gradient(90deg, #12151f, #1a1c29); border-bottom: 2px solid ${data.hud.color}; padding: 12px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <div>
                        <div style="font-size: 0.6em; color: #888; text-transform: uppercase;">Solana Memecoin Index</div>
                        <div style="font-size: 1.1em; font-weight: bold; color: ${data.hud.color};">${data.hud.icon} ${data.hud.change >= 0 ? '+' : ''}${data.hud.change}% <span style="font-size: 0.6em; color: #aaa;">Vol: $${data.hud.volume}M</span></div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.6em; color: #888; text-transform: uppercase;">Trend</div>
                        <div style="font-size: 0.75em; font-weight: bold; color: ${data.hud.color};">${data.hud.trend}</div>
                    </div>
                </div>

                <div id="scroll-area" style="flex-grow: 1; overflow-y: auto; padding: 12px; padding-bottom: 20px;">
                    
                    <!-- TAB 1: RADAR -->
                    <div id="view-radar">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <div style="font-family: monospace; color: #00ffcc; font-size: 0.85em; background: #12151f; padding: 4px 8px; border-radius: 4px; border: 1px solid #222;">🎯 ${tokenMint ? tokenMint.substring(0,15)+'...' : 'Nessun Token'}</div>
                            <button id="btn-ricarica" style="background: #2a2d3d; border: 1px solid #444; color: #fff; font-weight: bold; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8em;">🔄 Aggiorna</button>
                        </div>
                        ${tokenMint ? `
                        <div style="background: linear-gradient(145deg, #161821, #1e2130); padding: 15px; border-radius: 8px; border-left: 5px solid ${colorClass}; margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div><div style="font-size:0.7em; color:#aaa; text-transform: uppercase; margin-bottom:4px;">Stato Sicurezza</div><div style="font-weight:bold; font-size: 1.1em; color:${colorClass};">${rischio}</div></div>
                                <div style="text-align:right;"><div style="font-size:0.7em; color:#aaa; text-transform: uppercase; margin-bottom:4px;">Rischio</div><div style="font-size:1.6em; font-weight: 900; color:${colorClass};">${score}<span style="font-size: 0.5em; color: #777;">/100</span></div></div>
                            </div>
                        </div>
                        
                        <!-- NUOVA DASHBOARD TATTICA -->
                        <div class="radar-dashboard" style="background: #12151f; padding: 12px; border-radius: 8px; border: 1px solid #2d3142; font-size: 0.85em; margin-bottom: 15px;">
                            <div style="margin-bottom: 10px; border-left: 3px solid #ffaa00; padding-left: 8px;">
                                <span style="color: #aaaaaa; display: block; font-size: 0.8em; margin-bottom: 2px;">Terminale Dev (${devWallet.substring(0,6)}...):</span>
                                <span style="color: white; font-weight: bold;">${advice.devStatus}</span>
                            </div>
                            <div style="margin-bottom: 10px; border-left: 3px solid #00ffcc; padding-left: 8px;">
                                <span style="color: #aaaaaa; display: block; font-size: 0.8em; margin-bottom: 2px;">Analisi Volume (UBI):</span>
                                <span style="color: white; font-weight: bold;">${advice.volumeStatus}</span>
                            </div>
                            <div style="margin-bottom: 10px; border-left: 3px solid #ff4d4d; padding-left: 8px;">
                                <span style="color: #aaaaaa; display: block; font-size: 0.8em; margin-bottom: 2px;">Scudo Sanguisuga (Bundle):</span>
                                <span style="color: white; font-weight: bold;">${advice.topHoldersStatus}</span>
                            </div>
                        </div>

                        <!-- SIMULATORE ISTITUZIONALE -->
                        <div class="strategy-box" style="margin-bottom: 15px; background: #0a0c10; padding: 12px; border: 1px solid #00ffcc; border-radius: 8px;">
                            <h4 style="margin: 0 0 8px 0; color: #00ffcc; text-transform: uppercase; font-size: 0.9em;">🤖 Simulatore Istituzionale</h4>
                            <p style="margin: 0; font-family: monospace; font-size: 0.95em; color: #fff;">${advice.strategy}</p>
                        </div>

                        ${earlySectionHTML}
                        ${simulatoreHTML}
                        
                        <div style="background:#12151f; padding:12px; border-radius: 8px; border:1px solid #2d3142;">
                            <div style="font-size: 0.7em; color: #888; text-transform: uppercase; margin-bottom: 8px;">Log Eventi Grezzi</div>
                            ${logHTML}
                        </div>
                        ` : ''}
                    </div>

                    <!-- TAB 2: TRACKER -->
                    <div id="view-tracker" style="display: none;">
                        <div style="text-align: center; margin-bottom: 15px;"><h3 style="margin: 0; color: #00ffcc;">💼 Smart Money</h3><div style="font-size: 0.75em; color: #aaa;">Seleziona chi vuoi spiare attivamente</div></div>
                        <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                            <input type="text" id="new-wallet-input" placeholder="Indirizzo Solana..." style="flex-grow: 1; padding: 10px; background: #12151f; border: 1px solid #2d3142; border-radius: 6px; color: white; outline: none; font-size: 0.8em;">
                            <button id="add-wallet-btn" style="padding: 10px 15px; background: #00ffcc; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Salva</button>
                        </div>
                        <div id="tracked-wallets-list" style="font-size: 11px;"></div>
                    </div>

                    <!-- TAB 3: SPY FEED -->
                    <div id="view-spy" style="display: none;">
                        <div style="text-align: center; margin-bottom: 15px;"><h3 style="margin: 0; color: #ff007f;">🚨 Live Spy Feed</h3><div style="font-size: 0.75em; color: #aaa;">Cosa stanno comprando ORA le tue balene?</div></div>
                        <div id="spy-feed-list" style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="text-align:center; color:#555; font-style:italic; padding: 20px; font-size:0.9em;">In attesa di movimenti dai tuoi wallet con l'allarme attivo (🔔)...</div>
                        </div>
                    </div>

                </div>

                <!-- BOTTOM NAVIGATION -->
                <div style="display: flex; background: #12151f; border-top: 1px solid #222; height: 55px; flex-shrink: 0;">
                    <div id="tab-radar" class="nav-tab active-tab" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #00ffcc; border-top: 2px solid #00ffcc; background: rgba(0, 255, 204, 0.05);">
                        <span style="font-size: 1.2em; margin-bottom: 2px;">📡</span><span style="font-size: 0.65em; font-weight: bold; text-transform: uppercase;">Radar</span>
                    </div>
                    <div id="tab-tracker" class="nav-tab" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #777; border-top: 2px solid transparent;">
                        <span style="font-size: 1.2em; margin-bottom: 2px;">💼</span><span style="font-size: 0.65em; font-weight: bold; text-transform: uppercase;">Tracker</span>
                    </div>
                    <div id="tab-spy" class="nav-tab" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #777; border-top: 2px solid transparent;">
                        <span style="font-size: 1.2em; margin-bottom: 2px;">🚨</span><span style="font-size: 0.65em; font-weight: bold; text-transform: uppercase;">Spy Feed</span>
                    </div>
                </div>
            </div>
        `;

        const tabs = ['radar', 'tracker', 'spy'];
        function switchTab(activeId) {
            tabs.forEach(id => {
                document.getElementById(`view-${id}`).style.display = (id === activeId) ? 'block' : 'none';
                const tab = document.getElementById(`tab-${id}`);
                tab.classList.remove('spy-alert-active');
                if(id === activeId) {
                    const highlightColor = (id === 'spy') ? '#ff007f' : '#00ffcc';
                    tab.style.color = highlightColor;
                    tab.style.borderTop = `2px solid ${highlightColor}`;
                    tab.style.background = (id === 'spy') ? 'rgba(255, 0, 127, 0.05)' : 'rgba(0, 255, 204, 0.05)';
                } else {
                    tab.style.color = '#777';
                    tab.style.borderTop = '2px solid transparent';
                    tab.style.background = 'transparent';
                }
            });
        }

        tabs.forEach(id => document.getElementById(`tab-${id}`).addEventListener('click', () => switchTab(id)));
        
        // Assegniamo l'evento in modo sicuro
        const btnRicarica = document.getElementById('btn-ricarica');
        if (btnRicarica) {
            btnRicarica.addEventListener('click', avviaRadar);
        }

        if (data && data.tradeValido) {
            const inputEl = document.getElementById('sim-input');
            const costUsdEl = document.getElementById('sim-usd-cost');
            const grossSolEl = document.getElementById('sim-gross-sol');
            const netSolEl = document.getElementById('sim-net-sol');
            const netUsdEl = document.getElementById('sim-net-usd');
            const mult = data.moltiplicatore || 0;
            const solPrice = data.prezzoSol || 150;

            if (inputEl) {
                inputEl.addEventListener('input', () => {
                    let val = parseFloat(inputEl.value);
                    if(isNaN(val) || val < 0) val = 0;
                    if(costUsdEl) costUsdEl.innerText = (val * solPrice).toFixed(2);
                    const grossSol = (val * mult).toFixed(3);
                    if(grossSolEl) grossSolEl.innerText = grossSol;
                    const netSol = (grossSol - val).toFixed(3);
                    if(netSolEl) netSolEl.innerText = netSol;
                    if(netUsdEl) netUsdEl.innerText = (netSol * solPrice).toFixed(2);
                });
                inputEl.dispatchEvent(new Event('input'));
            }
        }

        // ... (sopra c'è la gestione degli input del simulatore)
        
        inizializzaTracker();
        caricaStoricoSpyNelDOM(); // 🔥 FIX: Ricarica lo storico ogni volta che apri un token
    }

    avviaRadar();

    // =========================================================
    // MOTORE IN BACKGROUND: SPY & TRACKER CON SELEZIONE
    // =========================================================
    
    function inizializzaTracker() {
        const addBtn = document.getElementById('add-wallet-btn');
        const inputField = document.getElementById('new-wallet-input');
        if (addBtn && inputField) {
            addBtn.addEventListener('click', () => {
                const newWallet = inputField.value.trim();
                if (newWallet.length >= 32 && newWallet.length <= 44) { 
                    chrome.storage.local.get(['trackedWallets'], function(result) {
                        let wallets = result.trackedWallets || [];
                        if (!wallets.includes(newWallet)) {
                            wallets.push(newWallet);
                            chrome.storage.local.set({ trackedWallets: wallets }, () => { inputField.value = ''; loadSavedWallets(); });
                        }
                    });
                }
            });
        }
        
        document.getElementById('content').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-wallet-btn')) {
                const wallet = e.target.getAttribute('data-wallet');
                if(confirm("Smettere di tracciare questo wallet?")) {
                    chrome.storage.local.get(['trackedWallets', 'walletNames', 'spiedWallets'], (res) => {
                        let wallets = res.trackedWallets || [];
                        let names = res.walletNames || {};
                        let spied = res.spiedWallets || [];
                        
                        wallets = wallets.filter(w => w !== wallet);
                        spied = spied.filter(w => w !== wallet);
                        delete names[wallet];
                        
                        chrome.storage.local.set({ trackedWallets: wallets, walletNames: names, spiedWallets: spied }, () => loadSavedWallets());
                    });
                }
            }
            if (e.target.classList.contains('edit-name-btn')) {
                const wallet = e.target.getAttribute('data-wallet');
                const nuovoNome = prompt("Inserisci un nome breve per ricordarlo (es. Balena 1):");
                if (nuovoNome !== null) {
                    chrome.storage.local.get(['walletNames'], (res) => {
                        let names = res.walletNames || {};
                        if (nuovoNome.trim() === "") delete names[wallet]; else names[wallet] = nuovoNome.trim();
                        chrome.storage.local.set({ walletNames: names }, () => loadSavedWallets());
                    });
                }
            }
            if (e.target.classList.contains('toggle-spy-btn')) {
                const wallet = e.target.getAttribute('data-wallet');
                chrome.storage.local.get(['spiedWallets'], (res) => {
                    let spied = res.spiedWallets || [];
                    if (spied.includes(wallet)) {
                        spied = spied.filter(w => w !== wallet); 
                    } else {
                        spied.push(wallet); 
                    }
                    chrome.storage.local.set({ spiedWallets: spied }, () => loadSavedWallets());
                });
            }
        });
        loadSavedWallets();
    }

    async function loadSavedWallets() {
        const listContainer = document.getElementById('tracked-wallets-list');
        if (!listContainer) return; 
        
        chrome.storage.local.get(['trackedWallets', 'walletNames', 'spiedWallets'], async function(result) {
            const wallets = result.trackedWallets || [];
            const walletNames = result.walletNames || {};
            const spiedWallets = result.spiedWallets || [];
            listContainer.innerHTML = ''; 

            for (const wallet of wallets) {
                const displayName = walletNames[wallet] || `${wallet.substring(0, 4)}...${wallet.slice(-4)}`;
                const isSpied = spiedWallets.includes(wallet);
                
                const spyBtnBg = isSpied ? '#ff007f' : '#242736';
                const spyBtnText = isSpied ? '🔔 Spia ON' : '🔕 OFF';
                const spyBtnColor = isSpied ? '#fff' : '#888';

                const walletItem = document.createElement('div');
                walletItem.style.cssText = "background: linear-gradient(145deg, #161821, #1a1c29); border: 1px solid #2d3142; border-radius: 8px; padding: 12px; margin-bottom: 12px;";
                walletItem.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:#00e6e6; font-size:1.05em;" title="${wallet}">${displayName}</strong>
                        <div style="display:flex; gap:4px;">
                            <button class="toggle-spy-btn" data-wallet="${wallet}" style="background:${spyBtnBg}; border:1px solid #3a3f58; color:${spyBtnColor}; border-radius:4px; padding:3px 6px; cursor:pointer; font-weight:bold; font-size:0.75em; transition:0.2s;">${spyBtnText}</button>
                            <button class="edit-name-btn" data-wallet="${wallet}" style="background:#242736; border:1px solid #3a3f58; color:#fff; border-radius:4px; padding:3px 6px; cursor:pointer;" title="Rinomina">✏️</button>
                            <button class="delete-wallet-btn" data-wallet="${wallet}" style="background:#362424; border:1px solid #583a3a; color:#ff4d4d; border-radius:4px; padding:3px 6px; cursor:pointer;" title="Elimina">🗑️</button>
                        </div>
                    </div>
                `;
                listContainer.appendChild(walletItem);
            }
        });
    }

    // =========================================================
    // MOTORE LIVE SPY (Sbloccato e Intelligente)
    // =========================================================
    let processedSigs = new Set();

    // =========================================================
    // MOTORE LIVE SPY (Intelligente & Memoria Anti-Doppioni)
    // =========================================================
    
    function caricaStoricoSpyNelDOM() {
        chrome.storage.local.get(['spyHistory'], (res) => {
            const history = res.spyHistory || [];
            const feed = document.getElementById('spy-feed-list');
            if (!feed) return;
            
            if (history.length > 0) {
                feed.innerHTML = ''; 
                history.forEach(item => aggiungiSpyCardHTML(item, false));
            } else {
                feed.innerHTML = `<div style="text-align:center; color:#555; font-style:italic; padding: 20px; font-size:0.9em;">In attesa di movimenti dai tuoi wallet con l'allarme attivo (🔔)...</div>`;
            }
        });
    }

    // 🔥 FIX: Ora restituisce una Promise per capire se la transazione è un doppione
    function salvaStoricoSpy(alertData) {
        return new Promise((resolve) => {
            chrome.storage.local.get(['spyHistory'], (res) => {
                let history = res.spyHistory || [];
                
                // CONTROLLO ANTI-VECCHIUME: Se la firma della transazione esiste già, scartala!
                const isDuplicate = history.some(h => h.signature === alertData.signature);
                if (isDuplicate) {
                    resolve(false); 
                    return;
                }

                history.unshift(alertData); 
                if (history.length > 20) history.pop(); 
                chrome.storage.local.set({ spyHistory: history }, () => {
                    resolve(true); // Salvataggio andato a buon fine (è una VERA nuova transazione)
                });
            });
        });
    }

    async function checkSpyWallets() {
        chrome.storage.local.get(['spiedWallets', 'walletNames'], async (res) => {
            const spied = res.spiedWallets || [];
            const names = res.walletNames || {};
            
            if (spied.length === 0) return;

            for (const wallet of spied) {
                try {
                    const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/spy-wallet/${wallet}`, {
                        headers: { "ngrok-skip-browser-warning": "true" }
                    });
                    if (!response.ok) continue;
                    const data = await response.json();
                    
                    if (data.actions && data.actions.length > 0) {
                        for (const action of data.actions.reverse()) {
                            
                            const alertData = {
                                type: action.type,
                                mint: action.mint,
                                signature: action.signature,
                                walletAddress: wallet,
                                walletName: names[wallet] || `${wallet.substring(0,4)}...`,
                                solSpent: action.solSpent,
                                strategy: action.strategy,
                                stats: data.walletStats // 🧠 Riceve dal server WinRate e Profilo (Bot/Umano)
                            };
                            
                            // Se la funzione ci dice che NON è un doppione, la aggiungiamo alla grafica
                            const isNew = await salvaStoricoSpy(alertData);
                            if (isNew) {
                                aggiungiSpyCardHTML(alertData, true);
                            }
                        }
                    }
                } catch (e) {
                    console.log("Errore connessione Spy:", e);
                }
            }
        });
    }

    function aggiungiSpyCardHTML(data, isNew) {
        const feed = document.getElementById('spy-feed-list');
        if (feed && feed.innerHTML.includes('In attesa')) feed.innerHTML = '';

        const isBuy = data.type === "BUY";
        const themeColor = isBuy ? '#00ffcc' : '#ff4d4d';
        const titleText = isBuy ? '🟢 HA COMPRATO' : '🔴 HA VENDUTO';
        
        let contentHTML = "";
        let statsHTML = "";

        // 🧠 INIEZIONE INTELLIGENZA NELLA GRAFICA (Badge Bot/Umano e WinRate)
        if (data.stats) {
            const wrColor = parseFloat(data.stats.winRate) >= 50 ? '#00e676' : '#ffaa00';
            statsHTML = `
                <div style="display:flex; gap:8px; margin-bottom: 10px; font-size: 0.8em; margin-top: 6px;">
                    <span style="background:#2a2d3d; padding:4px 8px; border-radius:4px; border:1px solid #444; color:#fff;">${data.stats.classificazione || 'Trader'}</span>
                    <span style="background:rgba(0, 230, 118, 0.1); padding:4px 8px; border-radius:4px; border:1px solid ${wrColor}; color:${wrColor}; font-weight:bold;">🎯 WR: ${data.stats.winRate || '0'}%</span>
                </div>
            `;
        }

        if (isBuy && data.strategy) {
            // 🔥 FIX BUG 0.00 SOL: Se nasconde la size col Router, non mostriamo "0.00"
            const solText = data.solSpent > 0.01 ? `${data.solSpent.toFixed(2)} SOL` : `Importo Nascosto (Routing DEX)`;
            
            contentHTML = `
                <div style="background:#11121a; border-left: 3px solid ${data.strategy.color}; padding:8px; border-radius:4px; margin-bottom:10px; font-size:0.85em;">
                    <strong style="color:${data.strategy.color};">${data.strategy.conviction}</strong><br>
                    <span style="color:#aaa;">Investimento: <b style="color:#fff;">${solText}</b></span>
                </div>
            `;
        } else if (!isBuy) {
            contentHTML = `
                <div style="background:rgba(255, 77, 77, 0.1); padding:8px; border-radius:4px; margin-bottom:12px; font-size:0.85em; color:#ff4d4d; border: 1px solid #ff4d4d;">
                    📉 Liquidazione / Uscita dalla posizione
                </div>
            `;
        }

        const card = document.createElement('div');
        card.style.cssText = `background:#161821; border-top: 3px solid ${themeColor}; padding: 12px; border-radius:6px; margin-bottom:10px; box-shadow: 0 4px 6px rgba(0,0,0,0.5);`;
        card.innerHTML = `
            <div style="color:${themeColor}; font-size:0.85em; margin-bottom:2px; font-weight:bold;">
                ${titleText}: <span style="color:#aaa; font-weight:normal;">${data.walletName}</span>
            </div>
            
            ${statsHTML}
            
            <div style="display:flex; justify-content:space-between; align-items:center; background:#0a0c10; padding:6px; border-radius:4px; margin-bottom:10px; border: 1px solid #2d3142;">
                <div style="font-family:monospace; font-size:0.95em; color:#fff;">
                    ${data.mint.substring(0,20)}...
                </div>
                <button class="copy-spy-mint-btn" data-mint="${data.mint}" style="background:#2a2d3d; border:1px solid #444; color:#fff; border-radius:4px; cursor:pointer; padding:4px 8px; font-weight:bold; font-size:0.8em; transition:0.2s;">
                    📋 Copia
                </button>
            </div>
            
            ${contentHTML}

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <a href="https://axiom.trade/token/${data.mint}" target="_blank" style="text-align:center; background:#222; border: 1px solid #444; color:#fff; padding:6px; border-radius:4px; text-decoration:none; font-size:0.8em; font-weight:bold;">🦍 Axiom</a>
                <a href="https://dexscreener.com/solana/${data.mint}" target="_blank" style="text-align:center; background:#1e2130; border: 1px solid #444; color:#fff; padding:6px; border-radius:4px; text-decoration:none; font-size:0.8em; font-weight:bold;">🦅 DexScreener</a>
            </div>
        `;
        
        if (feed) {
            if (isNew) feed.prepend(card);
            else feed.appendChild(card);
        }

        const copyBtn = card.querySelector('.copy-spy-mint-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                navigator.clipboard.writeText(e.target.getAttribute('data-mint')).then(() => {
                    e.target.innerText = "✅ Copiato"; e.target.style.background = "#00e676";
                    setTimeout(() => { e.target.innerText = "📋 Copia"; e.target.style.background = "#2a2d3d"; }, 2000);
                });
            });
        }

        if (isNew) {
            const tabSpy = document.getElementById('tab-spy');
            if(tabSpy && tabSpy.style.color !== 'rgb(255, 0, 127)') tabSpy.classList.add('spy-alert-active');
        }
    }

    async function startSpyLoop() {
        try {
            if (typeof checkSpyWallets === 'function') {
                await checkSpyWallets(); 
            }
        } catch (error) {
            console.error("Errore nel loop spy:", error);
        } finally {
            setTimeout(startSpyLoop, 10000); 
        }
    }

    startSpyLoop();
});