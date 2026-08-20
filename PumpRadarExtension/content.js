document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');

    // 🔥 1. CONNESSIONE WEBSOCKET (Sempre in ascolto)
    const socket = io("https://tricking-judiciary-footwear.ngrok-free.dev", {
        extraHeaders: { "ngrok-skip-browser-warning": "true" }
    });
    socket.on("connect", () => console.log("🟢 Connesso al Radar Quantitativo WSS"));
    // =========================================================
    // 🚀 RICEZIONE SEGNALI DAL CACCIATORE ALGORITMICO GLOBALE
    // =========================================================
    socket.on('golden_signal_found', (segnale) => {
        console.log("🎯 RILEVATO GOLDEN TOKEN:", segnale);

        let alertBox = document.getElementById('golden-alert-box');
        if (!alertBox) {
            alertBox = document.createElement('div');
            alertBox.id = 'golden-alert-box';
            alertBox.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; background: #12151f;
                border: 2px solid #ffaa00; box-shadow: 0 0 20px rgba(255, 170, 0, 0.5);
                padding: 15px; border-radius: 8px; z-index: 999999; color: white;
                font-family: monospace; animation: pulseRed 1s infinite; min-width: 300px;
            `;
            document.body.appendChild(alertBox);
        }

        alertBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ffaa00; padding-bottom:8px; margin-bottom:8px;">
                <span style="color:#ffaa00; font-weight:900; font-size:1.1em;">🚨 ALGORITMO MATCH!</span>
                <button id="close-golden-alert" style="background:transparent; border:none; color:#888; cursor:pointer; font-weight:bold; font-size:1.2em;">X</button>
            </div>
            
            <div style="font-size: 0.9em; line-height: 1.5; margin-bottom: 10px;">
                <div style="display:flex; justify-content:space-between;"><span style="color:#888;">Ratio Buy/Sell:</span> <span style="color:#00e676; font-weight:bold;">${segnale.ratio}</span></div>
                <div style="display:flex; justify-content:space-between;"><span style="color:#888;">Organic U-Index:</span> <span style="color:#00e676; font-weight:bold;">${segnale.uIndex}%</span></div>
                <div style="display:flex; justify-content:space-between;"><span style="color:#888;">Vol Entrata:</span> <span style="color:#fff; font-weight:bold;">${segnale.buyVol} SOL</span></div>
            </div>

            <div style="background: #050608; padding: 8px; border-radius: 4px; margin-bottom: 12px; border: 1px solid #2d3142; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-family: monospace; font-size: 0.75em; color: #00ffcc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="${segnale.mint}">${segnale.mint}</span>
                <button id="copy-golden-mint" style="background: #2a2d3d; border: 1px solid #444; color: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75em; font-weight: bold; flex-shrink: 0;">📋 Copia</button>
            </div>

            <a href="https://axiom.trade/token/${segnale.mint}" target="_blank" style="display:block; text-align:center; background:#ffaa00; color:#000; text-decoration:none; padding:8px; border-radius:4px; font-weight:900; letter-spacing:1px; transition:0.2s;">
                ⚡ APRI SU AXIOM
            </a>
        `;
        
        const audio = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');
        audio.play().catch(() => {});

        document.getElementById('close-golden-alert').addEventListener('click', () => alertBox.remove());

        const copyBtn = document.getElementById('copy-golden-mint');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(segnale.mint).then(() => {
                copyBtn.innerText = "✅ Copiato!"; copyBtn.style.background = "#00e676"; copyBtn.style.color = "#000";
                setTimeout(() => { copyBtn.innerText = "📋 Copia"; copyBtn.style.background = "#2a2d3d"; copyBtn.style.color = "#fff"; }, 2000);
            });
        });
    });
    let orderFlowWindow = [];
   window.liveMetrics = { history: [], buyVol: 0, sellVol: 0, buyPressure: 50 };
    window.paperPosition = { active: false, entrySol: 0, pnlSol: 0 };
    let processedSigs = new Set(); // Per il Tab 3 Spy
    // =========================================================
    // ⏱️ TIMER DI NOIA (AUTO-SCARTO TOKEN MORTI)
    // =========================================================
    let timerNoiaExtension;

    function resettaTimerNoia() {
        if (timerNoiaExtension) clearTimeout(timerNoiaExtension);
        
        // Impostiamo il timer a 25 secondi
        timerNoiaExtension = setTimeout(() => {
            console.log("🥱 [TIMEOUT] Nessun volume per 25 secondi. Token morto!");
            
            const hudHeader = document.getElementById('hud-header');
            if (hudHeader) {
                hudHeader.style.background = '#4a0000'; // Rosso scuro
                hudHeader.style.borderBottom = '3px solid #ff4d4d';
                hudHeader.style.animation = 'pulseRed 1s infinite';
                hudHeader.innerHTML = `
                    <div style="width: 100%; text-align: center;">
                        <div style="font-size: 1.2em; font-weight: 900; color: #ff4d4d; letter-spacing: 2px;">💀 TOKEN MORTO 💀</div>
                        <div style="font-size: 0.75em; color: #fff; margin-top: 4px;">Zero volumi da 25s. Cambia moneta!</div>
                    </div>
                `;
            }

            const simStatus = document.getElementById('paper-trade-status');
            if (simStatus) {
                simStatus.innerHTML = `<span style="color: #ff4d4d; font-weight:bold;">❌ Abbandonare il bersaglio.</span>`;
            }
            
            // Opzionale: Suono di errore quando muore
            const audio = new Audio('https://www.soundjay.com/buttons/beep-07.mp3');
            audio.play().catch(() => {});

        }, 25000); // 25.000 ms = 25 secondi
    }

    // =========================================================
    // AVVIO PRINCIPALE
    // =========================================================
    // =========================================================
    // AVVIO PRINCIPALE
    // =========================================================
    function avviaRadar() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) return;
            const url = tabs[0].url;
            
            const matchToken = url.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
            let tokenMint = null;
            if (matchToken) tokenMint = matchToken[0];

            if (!tokenMint || tokenMint === 'board' || tokenMint === 'create') {
                contentDiv.innerHTML = '<div style="padding: 20px; text-align:center; color:#888;">Naviga su un token per attivare il Radar.</div>';
                return;
            }

            // 🚀 STEP 1: CARICAMENTO ISTANTANEO (Apre UI Live)
           // 🚀 STEP 1: CARICAMENTO ISTANTANEO (Apre UI Live)
            costruisciInterfacciaLive(tokenMint);

            // ⏱️ AVVIA IL CONTO ALLA ROVESCIA
            resettaTimerNoia();

            // ⏳ STEP 2: RICERCA IN BACKGROUND (Analisi on-chain differita)
            fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${tokenMint}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                
                // 1. Popola i dati statici (Rete Sybil, Fedina Dev, ecc.)
                popolaInterfacciaStatica(data, tokenMint);
                
                // ⚖️ 2. SOLO ORA SVEGLIAMO GEMINI (I dati sono pronti!)
                avviaLaboratorioGemini(tokenMint);
            })
            .catch(err => {
                const staticBox = document.getElementById('static-analysis-box');
                if (staticBox) staticBox.innerHTML = `<div style="color:#ff4d4d; padding:15px; border:1px solid #ff4d4d; background: rgba(255, 77, 77, 0.1); border-radius:8px; text-align:center; margin-bottom: 15px;">⚠️ Errore Analisi Statica: ${err.message}</div>`;
            });
        });
    }

    // =========================================================
    // COSTRUZIONE GRAFICA
    // =========================================================
    function costruisciInterfacciaLive(tokenMint) {
        const copilotHTML = `
            <div style="background: rgba(18, 10, 25, 0.9); padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #b366ff; box-shadow: inset 0 0 10px rgba(179, 102, 255, 0.15);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.75em; color: #b366ff; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">🧠 Copilota AI (Groq)</span>
                    <button id="btn-copilot" style="background: #b366ff; color: #000; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75em; text-transform: uppercase; transition: all 0.2s; box-shadow: 0 0 8px rgba(179,102,255,0.4);">Richiedi Analisi</button>
                </div>
                <div id="copilot-result" style="font-family: monospace; font-size: 0.85em; color: #ccc; display: none; border-top: 1px dashed #4a2b66; padding-top: 10px; margin-top: 10px;"></div>
            </div>`;

        const orderFlowHTML = `
            <div style="background: rgba(10, 12, 16, 0.9); padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #2d3142;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.75em; color: #888; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">⏱️ 10s Order Flow</span>
                    <span id="flow-percentage" style="color: #00ffcc; font-weight: bold; font-family: monospace;">IN ATTESA...</span>
                </div>
                <div style="width: 100%; height: 10px; background: #ff4d4d; border-radius: 5px; overflow: hidden; box-shadow: inset 0 0 5px rgba(0,0,0,0.5);">
                    <div id="flow-bar-green" style="width: 50%; height: 100%; background: #00e676; transition: width 0.3s ease-out; box-shadow: 0 0 10px rgba(0,230,118,0.5);"></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 6px; font-family: monospace; font-size: 0.75em; color: #aaa;">
                    <span id="flow-vol-buy">0.0 SOL</span>
                    <span id="flow-vol-sell">0.0 SOL</span>
                </div>
            </div>`;

        const liveTapeHTML = `
            <div style="background: rgba(10, 12, 16, 0.9); padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #2d3142;">
                <div style="font-size: 0.75em; color: #888; text-transform: uppercase; margin-bottom: 8px; font-weight: 800; letter-spacing: 1px; display: flex; justify-content: space-between;">
                    <span>🔴 Live Tape</span>
                    <span style="color: #00ffcc; font-size: 0.8em;">WSS Sync</span>
                </div>
                <div id="live-tape-list" style="display: flex; flex-direction: column; gap: 6px; height: 180px; overflow-y: auto; padding-right: 4px;">
                    <div style="text-align:center; color:#555; font-style:italic; font-size:0.8em; margin-top:20px;">In ascolto della blockchain...</div>
                </div>
            </div>`;

        const spyBoxHTML = `
            <div id="spy-section" style="background: #222; padding: 10px; border-radius: 8px; border: 1px solid #444; margin-bottom: 15px;">
                <h4 id="spy-header" style="margin: 0 0 10px 0; color: #ffaa00; text-align: center; padding: 5px; border-radius: 4px; transition: all 0.3s ease;">
                    🕵️ Agente Spy in Ascolto...
                </h4>
                <div id="spy-log-container" style="max-height: 150px; overflow-y: auto; font-size: 11px;"></div>
            </div>`;

        contentDiv.innerHTML = `
            <style>
                @keyframes pulseTab { 0% { background: rgba(255, 0, 127, 0.1); } 50% { background: rgba(255, 0, 127, 0.4); box-shadow: 0 0 10px rgba(255,0,127,0.5); } 100% { background: rgba(255, 0, 127, 0.1); } }
                @keyframes pulseGlow { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                @keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); } }
                .spy-alert-active { animation: pulseRed 1s infinite !important; background-color: #660000 !important; color: #ff4d4d !important; border: 1px solid #ff4d4d !important; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #0a0c10; }
                ::-webkit-scrollbar-thumb { background: #2d3142; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #444a66; }
                @keyframes flashIn { 0% { background: #fff; } 100% { background: #161821; } }
            </style>
            
            <div style="width: 320px; height: 540px; display: flex; flex-direction: column; background: #050608; background-image: radial-gradient(circle at top right, #12151f 0%, transparent 50%); color: #fff; font-family: 'Segoe UI', Tahoma, sans-serif; position: relative; margin: -8px;">
                
                <div id="hud-header" style="background: rgba(18, 21, 31, 0.95); backdrop-filter: blur(5px); border-bottom: 2px solid #444; padding: 12px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; z-index: 10;">
                    <div style="color:#888; font-size:0.75em; font-family:monospace; animation: pulseGlow 2s infinite;">🔄 Scansione Indici in corso...</div>
                </div>

                <div id="scroll-area" style="flex-grow: 1; overflow-y: auto; padding: 15px; padding-bottom: 25px;">
                    
                    <!-- TAB 1: RADAR -->
                    <div id="view-radar">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <div style="font-family: monospace; color: #00ffcc; font-size: 0.85em; background: #0a0c10; padding: 6px 10px; border-radius: 6px; border: 1px solid #1a1c29;">🎯 ${tokenMint.substring(0,12)}...</div>
                            <div id="api-badge" style="display:none; gap:6px; align-items:center;"></div>
                            <button id="btn-ricarica" style="background: #161821; border: 1px solid #2d3142; color: #00ffcc; font-weight: bold; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.7em; text-transform: uppercase;">Ricarica</button>
                        </div>
                        
                        ${copilotHTML}
                        ${orderFlowHTML}
                        ${liveTapeHTML}

                        <!-- BOX SPY SOTTO AL RADAR -->
                        ${spyBoxHTML}

                        <!-- CONTENITORE DATI STATICI -->
                        <div id="static-analysis-box">
                            <div style="text-align: center; padding: 25px; background: rgba(0,0,0,0.3); border: 1px dashed #2d3142; border-radius: 8px; margin-bottom: 15px;">
                                <span style="font-size: 1.8em; display: block; margin-bottom: 10px; animation: pulseGlow 1.5s infinite;">🔍</span>
                                <span style="color: #00ffcc; font-family: monospace; font-size: 0.85em;">Autopsia Bundle in corso...<br><span style="color:#888; font-size: 0.75em; display:block; margin-top:6px;">(Tempo stimato: ~20s)</span></span>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: TRACKER -->
                    <div id="view-tracker" style="display: none;">
                        <div style="text-align: center; margin-bottom: 15px;"><h3 style="margin: 0; color: #00ffcc; font-weight: 900; letter-spacing: 1px;">💼 SMART MONEY</h3></div>
                        <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                            <input type="text" id="new-wallet-input" placeholder="Incolla Address..." style="flex-grow: 1; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid #2d3142; border-radius: 6px; color: white; outline: none; font-size: 0.8em; font-family: monospace;">
                            <button id="add-wallet-btn" style="padding: 10px 15px; background: #00ffcc; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Traccia</button>
                        </div>
                        <div id="tracked-wallets-list" style="font-size: 11px;"></div>
                    </div>

                    <!-- TAB 3: SPY FEED -->
                    <div id="view-spy" style="display: none;">
                        <div style="text-align: center; margin-bottom: 15px;"><h3 style="margin: 0; color: #ff007f; font-weight: 900; letter-spacing: 1px;">🚨 LIVE SPY FEED</h3></div>
                        <div id="spy-feed-list" style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="text-align:center; color:#555; font-style:italic; padding: 20px; font-size:0.9em;">In attesa di movimenti...</div>
                        </div>
                    </div>
                </div>

                <!-- BOTTOM TABS -->
                <div style="display: flex; background: rgba(10, 12, 16, 0.95); backdrop-filter: blur(5px); border-top: 1px solid #1a1c29; height: 55px; flex-shrink: 0; z-index: 10;">
                    <div id="tab-radar" class="nav-tab active-tab" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #00ffcc; border-top: 2px solid #00ffcc; background: rgba(0, 255, 204, 0.05); transition: all 0.2s;">
                        <span style="font-size: 1.2em; margin-bottom: 2px;">📡</span><span style="font-size: 0.6em; font-weight: 900; text-transform: uppercase;">Radar</span>
                    </div>
                    <div id="tab-tracker" class="nav-tab" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #777; border-top: 2px solid transparent; transition: all 0.2s;">
                        <span style="font-size: 1.2em; margin-bottom: 2px;">💼</span><span style="font-size: 0.6em; font-weight: 900; text-transform: uppercase;">Tracker</span>
                    </div>
                    <div id="tab-spy" class="nav-tab" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #777; border-top: 2px solid transparent; transition: all 0.2s;">
                        <span style="font-size: 1.2em; margin-bottom: 2px;">🚨</span><span style="font-size: 0.6em; font-weight: 900; text-transform: uppercase;">Spy</span>
                    </div>
                </div>
            </div>
        `;

        configuraEventiBase(tokenMint);
    }

    // =========================================================
    // EVENTI E LOGICA SOCKET
    // =========================================================
    function configuraEventiBase(tokenMint) {
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
                    tab.style.background = (id === 'spy') ? 'rgba(255, 0, 127, 0.08)' : 'rgba(0, 255, 204, 0.08)';
                } else {
                    tab.style.color = '#777';
                    tab.style.borderTop = '2px solid transparent';
                    tab.style.background = 'transparent';
                }
            });
        }
        tabs.forEach(id => document.getElementById(`tab-${id}`).addEventListener('click', () => switchTab(id)));

        const btnRicarica = document.getElementById('btn-ricarica');
        if (btnRicarica) {
            btnRicarica.addEventListener('mouseenter', () => btnRicarica.style.background = '#1a1c29');
            btnRicarica.addEventListener('mouseleave', () => btnRicarica.style.background = '#161821');
            btnRicarica.addEventListener('click', avviaRadar);
        }

        const btnCopilot = document.getElementById('btn-copilot');
        const copilotResult = document.getElementById('copilot-result');
        if (btnCopilot && tokenMint) {
            btnCopilot.addEventListener('mouseenter', () => btnCopilot.style.background = '#d9b3ff');
            btnCopilot.addEventListener('mouseleave', () => btnCopilot.style.background = '#b366ff');
            btnCopilot.addEventListener('click', async () => {
                btnCopilot.innerText = "⏳ Analisi in corso...";
                btnCopilot.style.background = "#555";
                btnCopilot.style.pointerEvents = "none";
                copilotResult.style.display = "block";
                copilotResult.innerHTML = "<span style='color:#888; display:block; text-align:center;'>Lettura parametri vitali...</span>";
                
                try {
                    // Prende l'ultimo frame dei volumi live o dei valori di sicurezza
                    const payloadDatiLive = window.liveMetrics || { buyVol: 0, sellVol: 0, buyPressure: 50 };

                    const resp = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/copilot/${tokenMint}`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            "ngrok-skip-browser-warning": "true" 
                        },
                        body: JSON.stringify(payloadDatiLive)
                    });
                    if (!resp.ok) throw new Error("Errore Backend");
                    const dataResp = await resp.json();
                    
                    let tattica = dataResp.tattica || "⚠️ Errore di comunicazione con il nodo AI.";
                    let puntoRottura = dataResp.puntoRottura || "Dati illeggibili.";
                    let azione = dataResp.azione || "ATTESA";
                    
                    if (dataResp.error || tattica.includes("Rate limit")) {
                        tattica = "🛑 LIMITE API GROQ RAGGIUNTO. Hai esaurito i 100.000 token giornalieri gratuiti.";
                        puntoRottura = "Devi attendere il reset dei server o usare un'altra API Key.";
                        azione = "API BLOCCATA";
                    }
                    
                    let actionColor = azione.includes("FUGG") || azione.includes("PANIC") || azione.includes("BLOCCATA") ? "#ff4d4d" : (azione.includes("COMPR") || azione.includes("SCALP") ? "#00e676" : "#ffaa00");
                    
                    copilotResult.innerHTML = `
                        <div style="margin-bottom: 8px;"><strong style="color:#b366ff; text-transform: uppercase;">1. Tattica:</strong><br><span style="color:#e0e0e0;">${tattica}</span></div>
                        <div style="margin-bottom: 10px;"><strong style="color:#ffaa00; text-transform: uppercase;">2. Previsione:</strong><br><span style="color:#e0e0e0;">${puntoRottura}</span></div>
                        <div style="text-align: center; padding: 6px; background: rgba(0,0,0,0.4); border: 1px solid ${actionColor}; color: ${actionColor}; font-weight: bold; border-radius: 4px; font-size: 1.1em; text-shadow: 0 0 5px ${actionColor}60;">Azione Consigliata: ${azione}</div>
                    `;
                } catch(e) {
                    copilotResult.innerHTML = `<div style="text-align:center; color:#ff4d4d; font-weight:bold;">⚠️ Errore Copilota: ${e.message}</div>`;
                } finally {
                    btnCopilot.innerText = "⏳ Cooldown 10s...";
                    btnCopilot.style.background = "#555";
                    setTimeout(() => {
                        btnCopilot.innerText = "🔄 Ri-analizza Tattica";
                        btnCopilot.style.background = "#b366ff";
                        btnCopilot.style.pointerEvents = "auto";
                    }, 10000);
                }
            });
        }

        inizializzaTracker();
        caricaStoricoSpyNelDOM();
        orderFlowWindow = [];

        // =========================================================
        // SOCKET: NASTRO LIVE E ORDER FLOW
        // =========================================================
        socket.off('nuovo_trade_live');
        socket.on('nuovo_trade_live', (trade) => {
            // 🔥 MOTORE P&L COLLEGATO AL NASTRO LIVE (Zero API)
            resettaTimerNoia();
            if (window.paperPosition && window.paperPosition.active) {
                const isBuyTrade = trade.tipo.includes("BUY");
                const tradeSize = parseFloat(trade.sol);
                
               // 🔥 VOLATILITÀ DINAMICA PUMP.FUN
                // Più il trade è grosso, più l'impatto esplode (Bonding Curve proxy)
                // 1 SOL ora sposterà il prezzo di base del 2.5%, e i trade grossi avranno un bonus di inerzia
                let priceImpactPct = tradeSize * 2.5; 
                
                // Effetto "Frenesia": se entra una balena con più di 3 SOL, l'impatto si moltiplica
                if (tradeSize > 3) priceImpactPct = priceImpactPct * 1.5;
                const pnlChange = window.paperPosition.entrySol * (priceImpactPct / 100);
                
                if (isBuyTrade) window.paperPosition.pnlSol += pnlChange;
                else window.paperPosition.pnlSol -= pnlChange;

                // Aggiorna la grafica in un millisecondo
                const simNetSol = document.getElementById('sim-net-sol');
                if (simNetSol) {
                    const isProfit = window.paperPosition.pnlSol >= 0;
                    simNetSol.style.color = isProfit ? '#00e676' : '#ff4d4d';
                    simNetSol.innerText = `${isProfit ? '+' : ''}${window.paperPosition.pnlSol.toFixed(4)} SOL`;
                }
            }
            // ... (il resto del codice del nastro rimane invariato)
            const tapeList = document.getElementById('live-tape-list');
            if (tapeList) {
                if (tapeList.innerHTML.includes('In ascolto')) tapeList.innerHTML = '';
                const isBuy = trade.tipo.includes("BUY");
                const color = isBuy ? "#00e676" : "#ff4d4d";
                const el = document.createElement('div');
                el.style.cssText = `font-family: monospace; font-size: 0.85em; color: ${color}; display: flex; justify-content: space-between; background: #161821; padding: 6px; border-radius: 4px; border-left: 3px solid ${color}; animation: flashIn 0.3s ease-out;`;
                
                el.innerHTML = `
                    <div style="display: flex; flex-direction: column; width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="font-weight: bold; font-size: 1.1em;">${trade.tipo} ${trade.sol} SOL</span>
                            <span style="font-size: 1.2em;" title="${trade.zooTag}">${trade.zooIcon}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8em;">
                            <span style="color:#aaa;">${trade.wallet.substring(0,4)}...${trade.wallet.slice(-4)}</span>
                            <a href="${trade.solscan}" target="_blank" style="color: #4da6ff; text-decoration: none; border: 1px solid #4da6ff; padding: 2px 6px; border-radius: 4px; transition: all 0.2s;">🔍 Solscan</a>
                        </div>
                    </div>`;
                tapeList.prepend(el);
                if (tapeList.children.length > 10) tapeList.removeChild(tapeList.lastChild);
            }

            orderFlowWindow.push(trade);
            const tenSecondsAgo = Date.now() - 10000;
            orderFlowWindow = orderFlowWindow.filter(t => t.timestamp > tenSecondsAgo);

            let buyVol = 0; let sellVol = 0;
            orderFlowWindow.forEach(t => { if (t.tipo.includes("BUY")) buyVol += parseFloat(t.sol); else sellVol += parseFloat(t.sol); });

            const totalVol = buyVol + sellVol;
            let buyPressure = 50;
            if (totalVol > 0) buyPressure = (buyVol / totalVol) * 100;

            // 🕵️ NUOVO: CALCOLO DELL'ORGANICITÀ (WASH TRADING DETECTION)
            let uniqueWallets = new Set();
            orderFlowWindow.forEach(t => uniqueWallets.add(t.wallet));
            let organicita = orderFlowWindow.length > 0 ? Math.round((uniqueWallets.size / orderFlowWindow.length) * 100) : 100;

            // 🔥 CERVELLO 5.0: SALVA IN MEMORIA LA STORIA PER L'IA
            const currentSnapshot = {
                time: new Date().toLocaleTimeString('it-IT'),
                buy: parseFloat(buyVol.toFixed(2)),
                sell: parseFloat(sellVol.toFixed(2)),
                pressure: parseFloat(buyPressure.toFixed(1)),
                organico: organicita // 👈 INIETTIAMO L'ORGANICITA'
            };

            window.liveMetrics.history.push(currentSnapshot);
            if (window.liveMetrics.history.length > 10) {
                window.liveMetrics.history.shift(); 
            }

            window.liveMetrics.buyVol = currentSnapshot.buy;
            window.liveMetrics.sellVol = currentSnapshot.sell;
            window.liveMetrics.buyPressure = currentSnapshot.pressure;
            window.liveMetrics.organicita = organicita; // 👈 LO SALVIAMO NEL GLOBALE PER PASSARLO AL BACKEND

            const barGreen = document.getElementById('flow-bar-green');
            const pctText = document.getElementById('flow-percentage');
            if (barGreen && pctText) {
                barGreen.style.width = `${buyPressure}%`;
                pctText.innerText = `${buyPressure.toFixed(1)}% BUY`;
                pctText.style.color = buyPressure >= 50 ? "#00e676" : "#ff4d4d";
                document.getElementById('flow-vol-buy').innerText = `${buyVol.toFixed(1)} SOL`;
                document.getElementById('flow-vol-sell').innerText = `${sellVol.toFixed(1)} SOL`;
            }
        });

        // =========================================================
        // SOCKET: ALLARME SPY (SYBIL DUMP)
        // =========================================================
        const spyHeader = document.getElementById('spy-header');
        const spyLogContainer = document.getElementById('spy-log-container');
        
        socket.off('spy_alert');
        socket.on('spy_alert', (data) => {
            console.warn("🚨 SPY ALERT RICEVUTO:", data.messaggio);

            // 1. INIETTA NEL NASTRO LIVE (In Cima)
            const tapeList = document.getElementById('live-tape-list');
            if (tapeList) {
                if (tapeList.innerHTML.includes('In ascolto')) tapeList.innerHTML = '';
                
                const spyCard = document.createElement('div');
                spyCard.style.cssText = "background: #330000; border: 1px solid #ff0000; padding: 8px; margin-bottom: 6px; border-radius: 4px; font-family: monospace; animation: flashIn 0.3s ease-out;";
                
                spyCard.innerHTML = `
                    <div style="color: #ff0000; font-weight: bold; font-size: 1.1em; border-bottom: 1px solid #ff4444; padding-bottom: 4px; margin-bottom: 6px;">
                        🚨 SYBIL DUMP RILEVATO
                    </div>
                    <div style="color: #ffaa00; font-size: 0.8em; margin-bottom: 6px;">
                        🕵️ Agente Spy Matematico
                    </div>
                    <div style="color: #fff; font-size: 0.85em; margin-bottom: 6px;">
                        <span style="color: #ff4d4d;">${data.wallets.map(w => w.substring(0,8) + '...').join('<br>')}</span>
                    </div>
                    <div style="color: #ff4d4d; font-weight: bold; font-size: 0.9em; margin-bottom: 8px;">
                        📉 ${data.messaggio}
                    </div>
                    <div style="display: flex; gap: 10px; border-top: 1px solid #ff4444; padding-top: 6px;">
                        <a href="https://axiom.trade/token/${tokenMint}" target="_blank" style="text-align:center; background:#222; border: 1px solid #444; color:#00ffcc; padding:4px 8px; border-radius:4px; text-decoration:none; font-size:0.85em; font-weight:bold;">🦍 Axiom</a>
                        <a href="https://dexscreener.com/solana/${tokenMint}" target="_blank" style="text-align:center; background:#1e2130; border: 1px solid #444; color:#00ffcc; padding:4px 8px; border-radius:4px; text-decoration:none; font-size:0.85em; font-weight:bold;">🦅 DexScreener</a>
                    </div>
                `;
                tapeList.prepend(spyCard);
                if (tapeList.children.length > 10) tapeList.removeChild(tapeList.lastChild);
            }

            // 2. INIETTA NEL BOX SPY IN BASSO
            if (spyLogContainer) {
                const alertElement = document.createElement('div');
                alertElement.style.background = 'rgba(255, 0, 0, 0.2)';
                alertElement.style.borderLeft = '4px solid #ff0000';
                alertElement.style.padding = '8px';
                alertElement.style.marginBottom = '8px';
                alertElement.style.borderRadius = '0 4px 4px 0';
                
                alertElement.innerHTML = `
                    <div style="color: #ff4d4d; font-weight: bold; font-size: 1.1em;">
                        [${data.timestamp}] 🚨 DUMP SYBIL RILEVATO
                    </div>
                    <div style="color: #e0e0e0; margin-top: 4px; font-size: 0.9em; margin-bottom: 8px;">
                        ${data.messaggio}
                    </div>
                    <div style="color: #888; font-size: 0.8em; margin-bottom: 8px;">
                        <strong>Wallet tracciati:</strong><br>
                        ${data.wallets.map(w => w.substring(0,6) + '...').join(', ')}
                    </div>
                `;
                spyLogContainer.prepend(alertElement);
            }

            // 3. EFFETTO LAMPEGGIANTE (Sul Tab Radar in basso e sull'header Spy)
            if (spyHeader) {
                spyHeader.classList.add('spy-alert-active');
                spyHeader.innerText = "🚨 DUMP IN CORSO! CLICCA PER RESETTARE";
            }
            
            const tabRadar = document.getElementById('tab-radar');
            if (tabRadar) {
                tabRadar.style.animation = 'pulseRed 1s infinite';
                tabRadar.style.backgroundColor = '#660000';
                tabRadar.style.color = '#ff4d4d';
                setTimeout(() => {
                    tabRadar.style.animation = 'none';
                    tabRadar.style.backgroundColor = 'rgba(0, 255, 204, 0.05)';
                    tabRadar.style.color = '#00ffcc';
                }, 5000);
            }
        });

        if (spyHeader) {
            spyHeader.addEventListener('click', () => {
                spyHeader.classList.remove('spy-alert-active');
                spyHeader.innerText = "🕵️ Agente Spy in Ascolto...";
            });
        }

        // =========================================================
        // 🔥 SOCKET: RICEZIONE AUTOPSIE DELLO SNIPER IBRIDO (NOVITA')
        // =========================================================
        // =========================================================
        // 🔥 SOCKET: RICEZIONE AUTOPSIE DELLO SNIPER IBRIDO
        // =========================================================
        socket.off('autopsia_sniper_live');
        socket.on('autopsia_sniper_live', (data) => {
            const feed = document.getElementById('spy-feed-list');
            if (feed) {
                if (feed.innerHTML.includes('In attesa')) feed.innerHTML = '';

                const card = document.createElement('div');
                card.style.cssText = `background:#161821; border-top: 3px solid ${data.colore}; padding: 12px; border-radius:6px; margin-bottom:10px; box-shadow: 0 4px 6px rgba(0,0,0,0.5); animation: flashIn 0.3s ease-out;`;
                
                // Creiamo un ID univoco per il tasto copia di questa specifica card
                const randomId = Math.random().toString(36).substring(7);
                const copyBtnId = `copy-btn-auto-${randomId}`;

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="color:#b366ff; font-weight:bold; font-size:0.85em; text-transform:uppercase;">⚙️ Raggi X Quantitativi</span>
                        <span style="background:${data.colore}20; border:1px solid ${data.colore}; color:${data.colore}; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:0.7em;">${data.esito}</span>
                    </div>
                    <div style="color:#aaa; font-size:0.8em; margin-bottom:8px;">
                        Generato dal wallet: <span style="color:#fff; font-family:monospace;">${data.walletSpia.substring(0,4)}...${data.walletSpia.slice(-4)}</span>
                    </div>
                    <div style="background:#0a0c10; border:1px solid #2d3142; padding:8px; border-radius:4px; margin-bottom:10px; font-size:0.85em; color:#e0e0e0;">
                        ${data.motivo}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#11121a; padding:6px; border-radius:4px; border: 1px dashed #444;">
                        <div style="font-family:monospace; font-size:0.9em; color:#00ffcc;" title="${data.mint}">
                            ${data.mint.substring(0,10)}...${data.mint.slice(-4)}
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button id="${copyBtnId}" data-mint="${data.mint}" style="background:#2a2d3d; border:1px solid #444; color:#fff; padding:4px 8px; border-radius:4px; font-size:0.75em; font-weight:bold; cursor:pointer; transition:0.2s;">
                                📋 Copia
                            </button>
                            <a href="https://axiom.trade/token/${data.mint}" target="_blank" style="background:#b366ff; border:1px solid #9933ff; color:#000; padding:4px 8px; border-radius:4px; font-size:0.75em; text-decoration:none; font-weight:bold; cursor:pointer;">
                                Axiom
                            </a>
                        </div>
                    </div>
                `;
                feed.prepend(card);
                
                // Aggiunge l'Event Listener al nuovo tasto Copia appena creato
                const copyBtn = document.getElementById(copyBtnId);
                if (copyBtn) {
                    copyBtn.addEventListener('click', (e) => {
                        const mintToCopy = e.target.getAttribute('data-mint');
                        navigator.clipboard.writeText(mintToCopy).then(() => {
                            e.target.innerText = "✅ Copiato!"; 
                            e.target.style.background = "#00e676"; 
                            e.target.style.color = "#000";
                            setTimeout(() => { 
                                e.target.innerText = "📋 Copia"; 
                                e.target.style.background = "#2a2d3d"; 
                                e.target.style.color = "#fff"; 
                            }, 2000);
                        });
                    });
                }
                
                if (feed.children.length > 15) feed.removeChild(feed.lastChild);
                
                const tabSpy = document.getElementById('tab-spy');
                if(tabSpy && tabSpy.style.color !== 'rgb(255, 0, 127)') tabSpy.classList.add('spy-alert-active');
            }
        });
    }

    // =========================================================
    // ANALISI STATICA
    // =========================================================
    function popolaInterfacciaStatica(data, tokenMint) {
        const hudHeader = document.getElementById('hud-header');
        if (hudHeader) {
            hudHeader.style.borderBottom = `2px solid ${data.hud.color}`;
            hudHeader.innerHTML = `
                <div>
                    <div style="font-size: 0.6em; color: #888; text-transform: uppercase; letter-spacing: 1px;">Solana Memecoin Index</div>
                    <div style="font-size: 1.1em; font-weight: 900; color: ${data.hud.color};">${data.hud.icon} ${data.hud.change >= 0 ? '+' : ''}${data.hud.change}% <span style="font-size: 0.6em; color: #aaa;">Vol: $${data.hud.volume}M</span></div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.6em; color: #888; text-transform: uppercase; letter-spacing: 1px;">Trend</div>
                    <div style="font-size: 0.75em; font-weight: bold; color: ${data.hud.color};">${data.hud.trend}</div>
                </div>`;
        }

        const staticBox = document.getElementById('static-analysis-box');
        if (!staticBox) return;
        
        const score = data.score || 0;
        const colorClass = score >= 80 ? '#ff3366' : (score >= 60 ? '#ffaa00' : '#00ffcc');
        
        let reportHTML = `
            <div style="background: linear-gradient(135deg, #12151f 0%, #0a0c10 100%); padding: 15px; border-radius: 8px; border: 1px solid #2d3142; border-left: 5px solid ${colorClass}; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div><div style="font-size:0.7em; color:#aaa; text-transform: uppercase; margin-bottom:4px; font-weight:bold;">Stato Contratto</div><div style="font-weight:900; font-size: 1.15em; color:${colorClass};">${data.rischio || "N/A"}</div></div>
                    <div style="text-align:right;"><div style="font-size:0.7em; color:#aaa; text-transform: uppercase; margin-bottom:4px; font-weight:bold;">Rischio</div><div style="font-size:1.8em; font-weight: 900; color:${colorClass}; font-family: monospace;">${score}<span style="font-size: 0.4em; color: #777;">/100</span></div></div>
                </div>
            </div>`;

        if (data.advice) {
            reportHTML += `
                <div style="background: rgba(18, 21, 31, 0.6); padding: 12px; border-radius: 8px; border: 1px solid #1a1c29; font-size: 0.85em; margin-bottom: 15px; font-family: monospace;">
                    <div style="margin-bottom: 10px; border-left: 3px solid ${data.advice.devStatus.includes('SERIAL') ? '#ff3366' : (data.advice.devStatus.includes('FRESH') ? '#ffaa00' : '#00ffcc')}; padding-left: 10px; background: rgba(0,0,0,0.2); padding: 4px 10px; border-radius: 0 4px 4px 0;">
                        <span style="color: #888; font-size: 0.8em; text-transform: uppercase;">[Dev_History]:</span> <span style="color: #e0e0e0; font-weight: bold;">${data.advice.devStatus}</span>
                    </div>
                    <div style="border-left: 3px solid #ffaa00; padding-left: 10px; background: rgba(0,0,0,0.2); padding: 4px 10px; border-radius: 0 4px 4px 0;">
                        <span style="color: #888; font-size: 0.8em; text-transform: uppercase;">[Bundle_Shield]:</span> <span style="color: #e0e0e0; font-weight: bold;">${data.advice.topHoldersStatus}</span>
                    </div>
                </div>`;
        }

        if (data.earlyRadar) {
            const er = data.earlyRadar;
            const badgeColor = er.potenzialeVolume.includes("ALTO") ? '#ff3366' : '#00ffcc';
            const supplyText = er.supplyBot < 1 ? '< 1% (Sniper Uscito)' : er.supplyBot + '%';
            const supplyColor = er.supplyBot >= 20 ? '#ff3366' : '#00ffcc';

            reportHTML += `
                <div style="background: rgba(18, 21, 31, 0.8); border: 1px solid ${badgeColor}60; padding: 12px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 0.8em; font-weight: 800; color: ${badgeColor}; text-transform: uppercase;">🤖 Bot & Sniper Detection</span>
                        <span style="background: ${badgeColor}20; color: ${badgeColor}; border: 1px solid ${badgeColor}; padding: 2px 6px; font-size: 0.65em; font-weight: bold; border-radius: 4px;">${er.potenzialeVolume}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8em; text-align: center;">
                        <div style="background: #161821; padding: 8px; border-radius: 6px; border: 1px solid #2d3142;">
                            <span style="color:#888; display:block; margin-bottom:4px; font-size: 0.9em;">Cecchino (Blocco 0)</span>
                            <b style="color:${er.bundleSlot0 ? '#ff3366' : '#00ffcc'}; font-size:1.1em;">${er.bundleSlot0 ? '⚠️ PRESENTE' : '✅ ASSENTE'}</b>
                        </div>
                        <div style="background: #161821; padding: 8px; border-radius: 6px; border: 1px solid #2d3142;">
                            <span style="color:#888; display:block; margin-bottom:4px; font-size: 0.9em;">Supply in mano ai Bot</span>
                            <b style="color:${supplyColor}; font-size:1.1em;">${supplyText}</b>
                        </div>
                    </div>
                </div>`;
        }

        if (data.tradingFees) {
            reportHTML += `
                <div style="background: rgba(18, 21, 31, 0.8); padding:12px; border-radius: 8px; border:1px solid #2d3142; margin-bottom: 15px;">
                    <div style="font-size: 0.7em; color: #888; text-transform: uppercase; margin-bottom: 10px; font-weight: 800;">⚙️ Impostazioni per il tuo Wallet/Bot</div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85em; background: #0a0c10; padding: 8px; border-radius: 6px; border: 1px solid #1a1c29;">
                        <span style="color: #aaa;">Slippage Consigliato: <strong style="color: #fff; font-family: monospace;">${data.tradingFees.slippage}</strong></span>
                        <span style="color: #aaa;">Priority Fee: <strong style="color: #fff; font-family: monospace;">${data.tradingFees.fee}</strong></span>
                    </div>
                </div>`;
        }

        staticBox.innerHTML = reportHTML;

        // ========================================================
        // GRAFICA E LOGICA LIVE PAPER TRADING (Zero API, 100% WSS)
        // ========================================================
        if (data.tradeValido) {
            // Grafica minimalista: solo input e PnL Live centrale
            reportHTML += `
                <div style="background: rgba(10, 12, 16, 0.9); padding: 15px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #00ffcc40;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="color: #00ffcc; font-weight: 900; text-transform: uppercase; font-size: 0.85em;">💸 Paper Trading </span>
                        <span id="paper-bilancio" style="background: #222; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 0.85em; color: #fff;">P&L: Caricamento...</span>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center; justify-content: center; font-size: 0.9em;">
                        <input type="number" id="sim-input" value="0.1" step="0.01" style="width: 70px; padding: 6px; background: #12151f; border: 1px solid #00ffcc; border-radius: 4px; color: #00ffcc; text-align: center; font-weight: bold; font-family: monospace; outline: none;">
                        <span>SOL Wallet Virtuale</span>
                    </div>

                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <button id="btn-paper-buy" style="flex: 1; padding: 8px; background: #00e67620; border: 1px solid #00e676; color: #00e676; border-radius: 4px; font-weight: bold; cursor: pointer; transition: 0.2s;">🟢 ENTRA (BUY)</button>
                        <button id="btn-paper-sell" style="flex: 1; padding: 8px; background: #ff4d4d20; border: 1px solid #ff4d4d; color: #ff4d4d; border-radius: 4px; font-weight: bold; cursor: pointer; transition: 0.2s; display: none;">🔴 ESCI (SELL)</button>
                    </div>

                    <div style="background: #161821; padding: 15px 10px; border-radius: 6px; text-align: center; font-family: monospace; border: 1px solid #2d3142;">
                        <span style="color: #aaa; font-size: 0.75em; text-transform: uppercase; display: block; margin-bottom: 6px; letter-spacing: 1px;">Profitto/Perdita Live</span>
                        <b id="sim-net-sol" style="color: #555; font-size: 1.6em; transition: color 0.2s ease-out;">0.0000 SOL</b>
                    </div>
                    
                    <div id="paper-trade-status" style="text-align: center; margin-top: 10px; font-size: 0.8em; color: #888; font-style: italic;">Pronto all'azione.</div>
                </div>`;
        }

        staticBox.innerHTML = reportHTML;

        // Attiva Logica Simulatore Matematico & Database Paper Trading
        if (data.tradeValido) {
            const inputEl = document.getElementById('sim-input');
            const btnBuy = document.getElementById('btn-paper-buy');
            const btnSell = document.getElementById('btn-paper-sell');
            const statusEl = document.getElementById('paper-trade-status');
            const bilancioEl = document.getElementById('paper-bilancio');
            const simNetSol = document.getElementById('sim-net-sol');

            // 1. Aggiornamento Bilancio Totale
            const aggiornaBilancio = (val) => {
                bilancioEl.innerHTML = `P&L Tot: <strong style="color: ${val >= 0 ? '#00e676' : '#ff4d4d'}">${val > 0 ? '+' : ''}${val.toFixed(3)} SOL</strong>`;
            };

            // Carica il bilancio iniziale all'apertura
            fetch('https://tricking-judiciary-footwear.ngrok-free.dev/api/paper-trading', {
                headers: { "ngrok-skip-browser-warning": "true" }
            })
            .then(res => res.json())
            .then(db => aggiornaBilancio(db.bilancio || 0))
            .catch(() => bilancioEl.innerText = "P&L: Error");

            // 2. Azione BUY (Attiva la reattività al Nastro WSS)
            if (btnBuy) {
                btnBuy.addEventListener('click', () => {
                    const importo = parseFloat(inputEl.value) || 0;
                    if (importo <= 0) return;

                    // Inizializza il tracking live per il WSS
                    window.paperPosition = { active: true, entrySol: importo, pnlSol: 0 };
                    
                    btnBuy.style.display = 'none';
                    btnSell.style.display = 'block';
                    inputEl.disabled = true;
                    
                    simNetSol.innerText = "0.0000 SOL";
                    simNetSol.style.color = "#00ffcc"; // Colore di partenza
                    statusEl.innerHTML = `<span style="color: #00e676; font-weight:bold;">✅ Entrato a mercato! Segui il nastro...</span>`;
                });
            }

            // 3. Azione SELL (Chiude e salva sul DB)
            if (btnSell) {
                btnSell.addEventListener('click', async () => {
                    const finalPnl = window.paperPosition.pnlSol;
                    window.paperPosition.active = false; // Stacca la spina dal WSS
                    
                    statusEl.innerHTML = `<span style="color: #ffaa00; font-weight:bold;">⏳ Chiusura posizione e salvataggio DB...</span>`;
                    
                    try {
                        const resp = await fetch('https://tricking-judiciary-footwear.ngrok-free.dev/api/paper-trading', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                "ngrok-skip-browser-warning": "true" 
                            },
                            body: JSON.stringify({
                                tokenMint: tokenMint, 
                                azione: "EXIT",
                                pnlNetto: finalPnl // Inviamo il PnL calcolato dal nostro Nastro Live
                            })
                        });
                        
                        const resData = await resp.json();
                        if (resData.success) {
                            statusEl.innerHTML = `<span style="color: #00e676; font-weight:bold;">✅ ${resData.messaggio}</span>`;
                            aggiornaBilancio(resData.bilancio);
                        } else {
                            statusEl.innerHTML = `<span style="color: #ff4d4d; font-weight:bold;">❌ Errore Backend: ${resData.error}</span>`;
                        }
                    } catch (e) {
                        statusEl.innerHTML = `<span style="color: #ff4d4d; font-weight:bold;">❌ Errore di Rete/Salvataggio DB</span>`;
                    }

                    // Ripristina l'interfaccia (senza far riferimento a variabili inesistenti)
                    btnBuy.style.display = 'block';
                    btnSell.style.display = 'none';
                    inputEl.disabled = false;
                    simNetSol.innerText = "0.0000 SOL";
                    simNetSol.style.color = "#555";
                    
                    setTimeout(() => {
                        if(statusEl.innerText.includes('Uscita')) statusEl.innerText = "Pronto all'azione.";
                    }, 4000);
                });
            }
        }
    }

    // =========================================================
    // SMART MONEY TRACKER (TAB 2 e TAB 3)
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

            // 🔥 QUESTA E' LA MAGIA: Invia i wallet con la "campanella accesa" al server backend!
            socket.emit('imposta_wallet_spia', spiedWallets);

            for (const wallet of wallets) {
                const displayName = walletNames[wallet] || `${wallet.substring(0, 4)}...${wallet.slice(-4)}`;
                const isSpied = spiedWallets.includes(wallet);
                // ... il resto del tuo ciclo for rimane identico!
                
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

    function salvaStoricoSpy(alertData) {
        return new Promise((resolve) => {
            chrome.storage.local.get(['spyHistory'], (res) => {
                let history = res.spyHistory || [];
                const isDuplicate = history.some(h => h.signature === alertData.signature);
                if (isDuplicate) {
                    resolve(false); 
                    return;
                }
                history.unshift(alertData); 
                if (history.length > 20) history.pop(); 
                chrome.storage.local.set({ spyHistory: history }, () => resolve(true));
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
                                stats: data.walletStats
                            };
                            const isNew = await salvaStoricoSpy(alertData);
                            if (isNew) aggiungiSpyCardHTML(alertData, true);
                        }
                    }
                } catch (e) { console.log("Errore connessione Spy:", e); }
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

        if (data.stats) {
            statsHTML = `
                <div style="display:flex; gap:8px; margin-bottom: 10px; font-size: 0.8em; margin-top: 6px;">
                    <span style="background:#2a2d3d; padding:4px 8px; border-radius:4px; border:1px solid #444; color:#fff;">${data.stats.classificazione || 'Analisi in corso...'}</span>
                    <span style="background:rgba(0, 170, 255, 0.1); padding:4px 8px; border-radius:4px; border:1px solid #00aaff; color:#00aaff; font-weight:bold;">⚡ Live Sync</span>
                </div>
            `;
        }

        if (isBuy && data.strategy) {
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
            setTimeout(startSpyLoop, 15000); 
        }
    }
    // =====================================================================
// ⚖️ LABORATORIO FORENSE: IL GIUDICE SUPREMO (GEMINI FLASH)
// =====================================================================
// =====================================================================
// ⚖️ LABORATORIO FORENSE: IL GIUDICE SUPREMO (GEMINI)
// =====================================================================
// =====================================================================
// ⚖️ LABORATORIO FORENSE: IL GIUDICE SUPREMO (Llama-3 via Groq)
// =====================================================================
async function avviaLaboratorioGemini(tokenMint) {
    let container = document.getElementById('gemini-report-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'gemini-report-container';
        container.style.cssText = `
            background: rgba(18, 10, 25, 0.9); 
            padding: 12px; 
            border-radius: 8px; 
            margin-bottom: 15px; 
            border: 1px solid #c084fc; 
            box-shadow: inset 0 0 10px rgba(192, 132, 252, 0.15);
        `;
        
        const radarView = document.getElementById('view-radar');
        const staticBox = document.getElementById('static-analysis-box');
        
        if (radarView && staticBox) radarView.insertBefore(container, staticBox);
        else if (radarView) radarView.appendChild(container);
    }

    // INTERFACCIA IN CARICAMENTO
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 0.75em; color: #c084fc; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">⚖️ Giudice Supremo</span>
            <button disabled style="background: #555; color: #ccc; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.7em; cursor: not-allowed;">⏳ Scansione...</button>
        </div>
        <div style="font-family: monospace; font-size: 0.85em; color: #ccc; text-align: center; padding: 10px; border-top: 1px dashed #4a2b66;">
            <span style="animation: pulseGlow 1.5s infinite;">Indagine forense e analisi Bundle in corso...</span>
        </div>
    `;

    try {
        const baseUrl = 'https://tricking-judiciary-footwear.ngrok-free.dev';
        const response = await fetch(`${baseUrl}/api/laboratorio/${tokenMint}`, {
            headers: { 
                "ngrok-skip-browser-warning": "true",
                "Accept": "application/json"
            }
        });
        const data = await response.json();
        
        if (data.success) {
            // INTERFACCIA COMPLETATA CON PULSANTE AGGIORNA
            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 0.75em; color: #c084fc; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">⚖️ Verdetto Giudice</span>
                    <button id="btn-refresh-judge" style="background: #c084fc; color: #000; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.7em; transition: all 0.2s; box-shadow: 0 0 8px rgba(192,132,252,0.4);">🔄 Aggiorna</button>
                </div>
                ${data.verdetto}
            `;

            // Logica del pulsante
            const btnRefresh = document.getElementById('btn-refresh-judge');
            btnRefresh.addEventListener('mouseenter', () => btnRefresh.style.background = '#d9b3ff');
            btnRefresh.addEventListener('mouseleave', () => btnRefresh.style.background = '#c084fc');
            btnRefresh.addEventListener('click', () => {
                avviaLaboratorioGemini(tokenMint); 
            });

        } else {
            container.innerHTML = `<div style="color:#ff4d4d; padding:10px;">⚠️ Errore AI: ${data.verdetto}</div>`;
        }
    } catch (error) {
        container.innerHTML = `<div style="color:#ff4d4d; padding:10px;">❌ Errore di connessione al Giudice. Assicurati che il backend sia attivo.</div>`;
    }
}
    // =========================================================
    // START SCRIPT
    // =========================================================
    avviaRadar();
    startSpyLoop();
});