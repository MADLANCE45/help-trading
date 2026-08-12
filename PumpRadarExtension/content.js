document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');

    // 🔥 1. CONNESSIONE WEBSOCKET (Sempre in ascolto)
    const socket = io("https://tricking-judiciary-footwear.ngrok-free.dev", {
        extraHeaders: { "ngrok-skip-browser-warning": "true" }
    });
    socket.on("connect", () => console.log("🟢 Connesso al Radar Quantitativo WSS"));

    let orderFlowWindow = [];

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

            // 🚀 STEP 1: CARICAMENTO ISTANTANEO (Apre UI Live in 0.1s)
            costruisciInterfacciaLive(tokenMint);

            // ⏳ STEP 2: RICERCA IN BACKGROUND (Analisi on-chain differita)
            fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${tokenMint}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                popolaInterfacciaStatica(data); // Inietta i dati quando sono pronti
            })
            .catch(err => {
                const staticBox = document.getElementById('static-analysis-box');
                if (staticBox) staticBox.innerHTML = `<div style="color:#ff4d4d; padding:15px; border:1px solid #ff4d4d; background: rgba(255, 77, 77, 0.1); border-radius:8px; text-align:center; margin-bottom: 15px;">⚠️ Errore Analisi Statica: ${err.message}</div>`;
            });
        });
    }

    function costruisciInterfacciaLive(tokenMint) {
        // 🔥 L'Occhio Tattico: Copilota
        const copilotHTML = `
            <div style="background: rgba(18, 10, 25, 0.9); padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #b366ff; box-shadow: inset 0 0 10px rgba(179, 102, 255, 0.15);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.75em; color: #b366ff; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">🧠 Copilota AI (Groq)</span>
                    <button id="btn-copilot" style="background: #b366ff; color: #000; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75em; text-transform: uppercase; transition: all 0.2s; box-shadow: 0 0 8px rgba(179,102,255,0.4);">Richiedi Analisi</button>
                </div>
                <div id="copilot-result" style="font-family: monospace; font-size: 0.85em; color: #ccc; display: none; border-top: 1px dashed #4a2b66; padding-top: 10px; margin-top: 10px;"></div>
            </div>`;

        // 🔥 Il Cuore: Velocimetro
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

        // 🔥 Il Sangue: Nastro WSS
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

        // Struttura Base e Iniezione Istantanea
        contentDiv.innerHTML = `
            <style>
                @keyframes pulseTab { 0% { background: rgba(255, 0, 127, 0.1); } 50% { background: rgba(255, 0, 127, 0.4); box-shadow: 0 0 10px rgba(255,0,127,0.5); } 100% { background: rgba(255, 0, 127, 0.1); } }
                @keyframes pulseGlow { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                .spy-alert-active { animation: pulseTab 1.5s infinite; color: #fff !important; border-top: 2px solid #ff007f !important; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #0a0c10; }
                ::-webkit-scrollbar-thumb { background: #2d3142; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #444a66; }
                @keyframes flashIn { 0% { background: #fff; } 100% { background: #161821; } }
            </style>
            
            <div style="width: 320px; height: 540px; display: flex; flex-direction: column; background: #050608; background-image: radial-gradient(circle at top right, #12151f 0%, transparent 50%); color: #fff; font-family: 'Segoe UI', Tahoma, sans-serif; position: relative; margin: -8px;">
                
                <!-- HEADER INDICE (Si popolerà dopo) -->
                <div id="hud-header" style="background: rgba(18, 21, 31, 0.95); backdrop-filter: blur(5px); border-bottom: 2px solid #444; padding: 12px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; z-index: 10;">
                    <div style="color:#888; font-size:0.75em; font-family:monospace; animation: pulseGlow 2s infinite;">🔄 Scansione Indici in corso...</div>
                </div>

                <div id="scroll-area" style="flex-grow: 1; overflow-y: auto; padding: 15px; padding-bottom: 25px;">
                    
                    <!-- TAB 1: RADAR (GERARCHIA VISIVA TATTICA) -->
                    <div id="view-radar">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <div style="font-family: monospace; color: #00ffcc; font-size: 0.85em; background: #0a0c10; padding: 6px 10px; border-radius: 6px; border: 1px solid #1a1c29;">🎯 ${tokenMint.substring(0,12)}...</div>
                            <div id="api-badge" style="display:none; gap:6px; align-items:center;"></div>
                            <button id="btn-ricarica" style="background: #161821; border: 1px solid #2d3142; color: #00ffcc; font-weight: bold; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.7em; text-transform: uppercase;">Ricarica</button>
                        </div>
                        
                        ${copilotHTML}
                        ${orderFlowHTML}
                        ${liveTapeHTML}

                        <!-- CONTENITORE ASINCRONO PER DATI STATICI -->
                        <div id="static-analysis-box">
                            <div style="text-align: center; padding: 25px; background: rgba(0,0,0,0.3); border: 1px dashed #2d3142; border-radius: 8px; margin-bottom: 15px;">
                                <span style="font-size: 1.8em; display: block; margin-bottom: 10px; animation: pulseGlow 1.5s infinite;">🔍</span>
                                <span style="color: #00ffcc; font-family: monospace; font-size: 0.85em;">Autopsia Bundle in corso...<br><span style="color:#888; font-size: 0.75em; display:block; margin-top:6px;">(Tempo stimato: ~20s)</span></span>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2 E 3 (Nascosti) -->
                    <div id="view-tracker" style="display: none;">
                        <div style="text-align: center; margin-bottom: 15px;"><h3 style="margin: 0; color: #00ffcc; font-weight: 900; letter-spacing: 1px;">💼 SMART MONEY</h3></div>
                        <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                            <input type="text" id="new-wallet-input" placeholder="Incolla Address..." style="flex-grow: 1; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid #2d3142; border-radius: 6px; color: white; outline: none; font-size: 0.8em; font-family: monospace;">
                            <button id="add-wallet-btn" style="padding: 10px 15px; background: #00ffcc; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Traccia</button>
                        </div>
                        <div id="tracked-wallets-list" style="font-size: 11px;"></div>
                    </div>

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

    function configuraEventiBase(tokenMint) {
        // Navigazione Tabs
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

        // Pulsante Ricarica
        const btnRicarica = document.getElementById('btn-ricarica');
        if (btnRicarica) {
            btnRicarica.addEventListener('mouseenter', () => btnRicarica.style.background = '#1a1c29');
            btnRicarica.addEventListener('mouseleave', () => btnRicarica.style.background = '#161821');
            btnRicarica.addEventListener('click', avviaRadar);
        }

        // 🧠 Azione Copilota
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
                    const resp = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/copilot/${tokenMint}`, {
                        headers: { "ngrok-skip-browser-warning": "true" }
                    });
                    if (!resp.ok) throw new Error("Errore Backend");
                    const dataResp = await resp.json();
                    
                    // Estrazione sicura dei dati (Fallback se Groq non risponde con le chiavi giuste)
                    let tattica = dataResp.tattica || "⚠️ Errore di comunicazione con il nodo AI.";
                    let puntoRottura = dataResp.puntoRottura || "Dati illeggibili.";
                    let azione = dataResp.azione || "ATTESA";
                    
                    // Se l'API restituisce un errore testuale puro (es. Rate Limit)
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
                    
                    // Impedisce lo spam di richieste per salvare i Token API
                    setTimeout(() => {
                        btnCopilot.innerText = "🔄 Ri-analizza Tattica";
                        btnCopilot.style.background = "#b366ff";
                        btnCopilot.style.pointerEvents = "auto";
                    }, 10000);
                }
            });
        }

        // Gestione WSS e Order Flow Dinamico
        inizializzaTracker();
        caricaStoricoSpyNelDOM();
        orderFlowWindow = [];

        socket.off('nuovo_trade_live');
        socket.on('nuovo_trade_live', (trade) => {
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
    }

    function popolaInterfacciaStatica(data) {
        // Aggiorna HUD in cima
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

        // ... (Codice precedente dell'Advice) ...

        if (data.earlyRadar) {
            const er = data.earlyRadar;
            const badgeColor = er.potenzialeVolume.includes("ALTO") ? '#ff3366' : '#00ffcc';
            
            // 🔥 LOGICA INTELLIGENTE: Se il bot c'era ma ha lo 0%, significa che è già scappato.
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
            let feeColor = data.tradingFees.text.includes('🔥') ? '#ff3366' : (data.tradingFees.text.includes('⚡') ? '#ffaa00' : '#00ffcc');
            reportHTML += `
                <div style="background: rgba(18, 21, 31, 0.8); padding:12px; border-radius: 8px; border:1px solid #2d3142; margin-bottom: 15px;">
                    <div style="font-size: 0.7em; color: #888; text-transform: uppercase; margin-bottom: 10px; font-weight: 800;">⚙️ Impostazioni per il tuo Wallet/Bot</div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85em; background: #0a0c10; padding: 8px; border-radius: 6px; border: 1px solid #1a1c29;">
                        <span style="color: #aaa;">Slippage Consigliato: <strong style="color: #fff; font-family: monospace;">${data.tradingFees.slippage}</strong></span>
                        <span style="color: #aaa;">Priority Fee: <strong style="color: #fff; font-family: monospace;">${data.tradingFees.fee}</strong></span>
                    </div>
                </div>`;
        }

        if (data.tradeValido) {
            reportHTML += `
                <div style="background: rgba(10, 12, 16, 0.9); padding: 15px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #00ffcc40;">
                    <div style="color: #00ffcc; margin-bottom: 12px; font-weight: 900; text-align: center; text-transform: uppercase; font-size: 0.85em;">💸 Terminale Profitti Simulator</div>
                    <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center; justify-content: center; font-size: 0.9em;">
                        <input type="number" id="sim-input" value="0.1" step="0.01" style="width: 70px; padding: 6px; background: #12151f; border: 1px solid #00ffcc; border-radius: 4px; color: #00ffcc; text-align: center; font-weight: bold; font-family: monospace; outline: none;">
                        <span>SOL <span style="font-size:0.85em; color:#666;">($<span id="sim-usd-cost">...</span>)</span></span>
                    </div>
                    <div style="background: #161821; padding: 10px; border-radius: 6px; border-left: 4px solid #00ffcc; font-family: monospace;">
                        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #333; padding-top: 6px;">
                            <span style="color: #aaa;">Profitto Netto:</span><b style="color: #00e676; font-size: 1.1em;">+<span id="sim-net-sol">...</span> SOL (+$<span id="sim-net-usd">...</span>)</b>
                        </div>
                    </div>
                </div>`;
        }

        staticBox.innerHTML = reportHTML;

        // Attiva Simulatore Matematico
        if (data.tradeValido) {
            const inputEl = document.getElementById('sim-input');
            const mult = data.moltiplicatore || 0;
            const solPrice = data.prezzoSol || 150;
            if (inputEl) {
                inputEl.addEventListener('input', () => {
                    let val = parseFloat(inputEl.value) || 0;
                    document.getElementById('sim-usd-cost').innerText = (val * solPrice).toFixed(2);
                    const grossSol = (val * mult);
                    const netSol = (grossSol - val).toFixed(3);
                    document.getElementById('sim-net-sol').innerText = netSol;
                    document.getElementById('sim-net-usd').innerText = (netSol * solPrice).toFixed(2);
                });
                inputEl.dispatchEvent(new Event('input'));
            }
        }
    }

    avviaRadar();

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

        // 🧠 INIEZIONE INTELLIGENZA NELLA GRAFICA (Solo dati reali)
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
            // 🛡️ FIX HELIUS: Aggiorniamo le balene ogni 15 secondi per non collassare il nodo
            setTimeout(startSpyLoop, 15000); 
        }
    }

    startSpyLoop();
});