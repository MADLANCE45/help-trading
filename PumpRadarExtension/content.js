document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');

    // 🔥 1. CONNESSIONE WEBSOCKET
    const socket = io("https://tricking-judiciary-footwear.ngrok-free.dev", {
        extraHeaders: { "ngrok-skip-browser-warning": "true" }
    });
    socket.on("connect", () => console.log("🟢 Connesso al Radar Quantitativo WSS"));
    
    // =========================================================
    // 🚀 GOLDEN ALERT (Popup Intelligente)
    // =========================================================
    socket.on('golden_signal_found', async (segnale) => {
        const actualMint = typeof segnale === 'string' ? segnale : (segnale.mint || "Errore_Mint");
        
        let alertBox = document.getElementById('golden-alert-box');
        if (!alertBox) {
            alertBox = document.createElement('div');
            alertBox.id = 'golden-alert-box';
            alertBox.style.cssText = `
                position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
                width: 90%; max-width: 320px; background: linear-gradient(135deg, #12151f 0%, #0a0c10 100%);
                border: 1px solid #00ffcc; box-shadow: 0 10px 25px rgba(0,0,0,0.9), 0 0 15px rgba(0, 255, 204, 0.3);
                padding: 12px; border-radius: 10px; z-index: 999999; color: white;
                font-family: 'Segoe UI', Tahoma, sans-serif; box-sizing: border-box;
                animation: pulseGlow 2s infinite;
                transition: transform 0.2s;
            `;
            alertBox.addEventListener('mouseenter', () => alertBox.style.animationPlayState = 'paused');
            alertBox.addEventListener('mouseleave', () => alertBox.style.animationPlayState = 'running');
            document.body.appendChild(alertBox);
        }

        // Se il server è in "Bypass Velocità", non ha calcolato i SOL. Mettiamo "Lettura Live..."
        const solSpesi = segnale.solSpent || segnale.buyVol;
        const solText = solSpesi ? `${solSpesi} SOL` : `<span style="color:#aaa; font-size:0.9em;">Lettura WSS...</span>`;

        alertBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(0, 255, 204, 0.3); padding-bottom:8px; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap: 8px;">
                    <span style="font-size: 1.2em;">🚨</span>
                    <span style="color:#00ffcc; font-weight:900; font-size:1em; letter-spacing: 1px;">WHALE MATCH!</span>
                </div>
                <button id="close-golden-alert" style="background:transparent; border:none; color:#888; cursor:pointer; font-weight:bold; font-size:1.2em;">✕</button>
            </div>
            
            <div id="golden-stats-${actualMint}" style="background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 10px; margin-bottom: 10px; font-family: monospace; font-size: 0.85em; min-height: 70px;">
                <div style="text-align: center; color: #888; font-size: 0.9em; margin-top: 15px; animation: pulseGlow 1s infinite;">🔄 Estrazione dati mercato...</div>
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
                <button id="copy-golden-mint" style="background: #2a2d3d; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.8em; font-weight: bold; flex: 1; transition: 0.2s;">📋 Copia Mint</button>
                <a href="https://pump.fun/${actualMint}" target="_blank" style="flex: 2; text-align:center; background: linear-gradient(90deg, #00ffcc, #00b38f); color:#000; text-decoration:none; padding:8px; border-radius:6px; font-weight:900; font-size: 0.85em; letter-spacing:1px; box-shadow: 0 4px 10px rgba(0, 255, 204, 0.3);">
                    💊 APRI PUMP.FUN
                </a>
            </div>
        `;
        
        document.getElementById('close-golden-alert').addEventListener('click', () => alertBox.remove());
        const copyBtn = document.getElementById('copy-golden-mint');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(actualMint).then(() => {
                copyBtn.innerText = "✅ Copiato!"; copyBtn.style.background = "#00e676"; copyBtn.style.color = "#000";
                setTimeout(() => { copyBtn.innerText = "📋 Copia Mint"; copyBtn.style.background = "#2a2d3d"; copyBtn.style.color = "#fff"; }, 2000);
            });
        });
        
        // RECUPERO DATI DEXSCREENER CON RISPOSTA INTELLIGENTE
        try {
            const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${actualMint}`);
            const dexData = await dexRes.json();
            const pair = (dexData.pairs && dexData.pairs.length > 0) ? dexData.pairs[0] : null;
            
            const statsContainer = document.getElementById(`golden-stats-${actualMint}`);
            
            if (statsContainer && pair) {
                const mc = pair.fdv || pair.marketCap || 0;
                const liq = pair.liquidity?.usd || 0;
                
                // 🔥 NUOVA FEATURE: Calcolo progressi della Bonding Curve di Pump.fun (~$80k graduation)
                let liqRow = `<div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span style="color:#888;">Liquidità:</span> <span style="color:#fff; font-weight:bold;">$${liq.toLocaleString()}</span></div>`;
                if (liq === 0 && mc > 0) {
                    const curvePercent = Math.min(100, (mc / 80000) * 100).toFixed(1);
                    liqRow = `<div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span style="color:#888;">Curva Pump.fun:</span> <span style="color:#c084fc; font-weight:bold;">${curvePercent}% Completata</span></div>`;
                }

                statsContainer.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span style="color:#888;">Azione:</span> <span style="color:#00ffcc; font-weight:bold;">BALENA IN ACQUISTO</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span style="color:#888;">Market Cap:</span> <span style="color:#fff; font-weight:bold;">$${mc.toLocaleString()}</span></div>
                    ${liqRow}
                    <div style="display:flex; justify-content:space-between;"><span style="color:#888;">Vol 5m:</span> <span style="color:#ffaa00; font-weight:bold;">$${(pair.volume?.m5 || 0).toLocaleString()}</span></div>
                `;
            } else if (statsContainer) {
                statsContainer.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom: 6px;"><span style="color:#888;">Azione:</span> <span style="color:#00ffcc; font-weight:bold;">BALENA IN ACQUISTO</span></div>
                    <div style="text-align:center; padding: 6px; background: rgba(255, 77, 77, 0.2); border: 1px solid #ff4d4d; border-radius: 4px; color:#ff4d4d; font-size:0.85em; font-weight: bold;">
                        ⚠️ Token Neonato<br><span style="font-size:0.8em; color:#e0e0e0; font-weight:normal;">Ancora invisibile a DexScreener. Procedi con cautela.</span>
                    </div>
                `;
            }
        } catch(e) {}
    });

    let orderFlowWindow = [];
    window.liveMetrics = { history: [], buyVol: 0, sellVol: 0, buyPressure: 50 };
    window.paperPosition = { active: false, entrySol: 0, pnlSol: 0 };

    // =========================================================
    // ⏱️ TIMER DI NOIA (AUTO-SCARTO TOKEN MORTI)
    // =========================================================
    let timerNoiaExtension;
    function resettaTimerNoia() {
        if (timerNoiaExtension) clearTimeout(timerNoiaExtension);
        timerNoiaExtension = setTimeout(() => {
            const hudHeader = document.getElementById('hud-header');
            if (hudHeader) {
                hudHeader.style.background = '#4a0000'; 
                hudHeader.style.borderBottom = '3px solid #ff4d4d';
                hudHeader.style.animation = 'pulseRed 2.5s infinite';
                hudHeader.innerHTML = `
                    <div style="width: 100%; text-align: center;">
                        <div style="font-size: 1.2em; font-weight: 900; color: #ff4d4d; letter-spacing: 2px;">💀 TOKEN MORTO 💀</div>
                        <div style="font-size: 0.75em; color: #fff; margin-top: 4px;">Zero volumi da 25s. Cambia moneta!</div>
                    </div>
                `;
            }
        }, 25000); 
    }

    // =========================================================
    // 📡 AVVIO E MEMORIA
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

            costruisciInterfacciaLive(tokenMint);
            resettaTimerNoia();

            chrome.storage.local.get(['ultimoTokenScansionato', 'ultimoRisultatoScan'], (memoria) => {
                if (memoria.ultimoTokenScansionato === tokenMint && memoria.ultimoRisultatoScan) {
                    popolaInterfacciaStatica(memoria.ultimoRisultatoScan, tokenMint);
                    avviaLaboratorioGemini(tokenMint); 
                    fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${tokenMint}`, {
                        headers: { "ngrok-skip-browser-warning": "true" }
                    }).catch(() => {});
                } else {
                    fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${tokenMint}`, {
                        headers: { "ngrok-skip-browser-warning": "true" }
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.error) throw new Error(data.error);
                        chrome.storage.local.set({ ultimoTokenScansionato: tokenMint, ultimoRisultatoScan: data });
                        popolaInterfacciaStatica(data, tokenMint);
                        avviaLaboratorioGemini(tokenMint);
                    })
                    .catch(err => {
                        const staticBox = document.getElementById('static-analysis-box');
                        if (staticBox) staticBox.innerHTML = `<div style="color:#ff4d4d; padding:15px; border:1px solid #ff4d4d; background: rgba(255, 77, 77, 0.1); border-radius:8px; text-align:center;">⚠️ Errore: ${err.message}</div>`;
                    });
                }
            });
        });
    }

    // =========================================================
    // 🎨 COSTRUZIONE INTERFACCIA
    // =========================================================
    function costruisciInterfacciaLive(tokenMint) {
        // 🔗 CREA I LINK LOCALI E SICURI ALLE TUE IMMAGINI
        const av1 = chrome.runtime.getURL("avatar1.png");
        const av2 = chrome.runtime.getURL("avatar2.png");
        const av3 = chrome.runtime.getURL("avatar3.png");
        const av4 = chrome.runtime.getURL("avatar4.png");
        const copilotHTML = `
            <div style="background: rgba(18, 10, 25, 0.9); padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #b366ff; box-shadow: inset 0 0 10px rgba(179, 102, 255, 0.15);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.75em; color: #b366ff; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">🧠 Copilota AI</span>
                    <button id="btn-copilot" style="background: #b366ff; color: #000; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75em; text-transform: uppercase;">Richiedi Analisi</button>
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
                    <div id="flow-bar-green" style="width: 50%; height: 100%; background: #00e676; transition: width 0.3s ease-out;"></div>
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

        contentDiv.innerHTML = `
            <style>
                @keyframes pulseGlow { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                @keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); } }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #0a0c10; }
                ::-webkit-scrollbar-thumb { background: #2d3142; border-radius: 3px; }
                .avatar-option { width: 36px; height: 36px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; opacity: 0.5; transition: 0.2s; object-fit: cover; }
                .avatar-option.active { border: 2px solid #00ffcc; opacity: 1; transform: scale(1.1); box-shadow: 0 0 10px rgba(0,255,204,0.4); }
            </style>
            
            <div style="width: 320px; height: 540px; display: flex; flex-direction: column; background: #050608; background-image: radial-gradient(circle at top right, #12151f 0%, transparent 50%); color: #fff; font-family: 'Segoe UI', Tahoma, sans-serif; margin: -8px;">
                
                <!-- 🔥 HEADER A DUE PIANI -->
                <div id="hud-header" style="background: rgba(18, 21, 31, 0.95); backdrop-filter: blur(5px); border-bottom: 2px solid #444; padding: 12px; display: flex; flex-direction: column; flex-shrink: 0; z-index: 10;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div>
                            <div style="font-size: 0.6em; color: #888; text-transform: uppercase; letter-spacing: 1px;">MEME SAVER</div>
                            <div style="font-size: 0.9em; font-weight: 900; color: #00ffcc;">Your Trading Helper</div>
                        </div>
                        <!-- AVATAR UTENTE IN ALTO A DESTRA -->
                        <div id="btn-user-profile" title="Pannello Utente" style="background: #1a1c29; border: 1px solid #2d3142; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; box-shadow: 0 0 10px rgba(0,255,204,0.1); overflow: hidden;">
                            <img id="current-user-avatar" src="${av1}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    </div>

                    <div id="hud-stats-container" style="display: none; justify-content: space-between; width: 100%; border-top: 1px dashed #2d3142; margin-top: 10px; padding-top: 8px;">
                    </div>
                </div>

                <div id="scroll-area" style="flex-grow: 1; overflow-y: auto; padding: 15px; padding-bottom: 25px;">
                    
                    <!-- ⚙️ TAB SEGRETO: USER DASHBOARD -->
                    <div id="view-user" style="display: none; height: 100%;">
                        
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 15px;">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b366ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: pulseGlow 3s infinite;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            <div>
                                <h3 style="margin: 0; color: #fff; font-weight: 900; letter-spacing: 1px;">Control Room</h3>
                                <div style="color: #888; font-size: 0.65em; margin-top: 2px; text-transform: uppercase;">Impostazioni Algoritmiche</div>
                            </div>
                        </div>

                        <!-- SELETTORE AVATAR MEME LOCALI -->
                        <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #2d3142;">
                            <img class="avatar-option active" data-src="${av1}" src="${av1}" title="Avatar 1">
                            <img class="avatar-option" data-src="${av2}" src="${av2}" title="Avatar 2">
                            <img class="avatar-option" data-src="${av3}" src="${av3}" title="Avatar 3">
                            <img class="avatar-option" data-src="${av4}" src="${av4}" title="Avatar 4">
                        </div>

                        <!-- 0. WALLET DI ESECUZIONE -->
                        <div style="background: #161821; border: 1px solid #2d3142; border-left: 3px solid #ff007f; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                            <strong style="color: #ff007f; font-size: 0.85em; text-transform: uppercase;">🏦 Wallet Operativo</strong>
                            <div style="margin-top: 8px;">
                                <label style="font-size: 0.7em; color: #aaa;">Chiave Privata (Formato Base58)</label>
                                <input type="password" id="user-private-key" placeholder="Incolla la tua private key..." style="width: 100%; box-sizing: border-box; background: #0a0c10; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.75em; margin-top: 2px;">
                            </div>
                        </div>
                        
                        <!-- (QUI PROSEGUE CON RPC, JITO TIP, Ecc.. lascialo invariato fino alla chiusura di view-user) -->

                        <!-- 1. MOTORE RPC (NODO VELOCE) -->
                        <div style="background: #161821; border: 1px solid #2d3142; border-left: 3px solid #4da6ff; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                            <strong style="color: #4da6ff; font-size: 0.85em; text-transform: uppercase;">⚡ API Helius (Nodo Veloce)</strong>
                            <div style="margin-top: 8px;">
                                <input type="text" id="user-rpc-url" placeholder="https://mainnet.helius-rpc.com/?api-key=..." style="width: 100%; box-sizing: border-box; background: #0a0c10; border: 1px solid #444; color: #00ffcc; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.75em;">
                                <div style="color: #888; font-size: 0.7em; margin-top: 4px;">Usa la tua API per operare senza blocchi.</div>
                            </div>
                        </div>

                        <!-- 2. SCUDO MEV & ESECUZIONE -->
                        <div style="background: #161821; border: 1px solid #2d3142; border-left: 3px solid #b366ff; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                            <strong style="color: #b366ff; font-size: 0.85em; text-transform: uppercase;">🛡️ Scudo Jito MEV</strong>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                                <div>
                                    <label style="font-size: 0.7em; color: #aaa;">Jito Tip (SOL)</label>
                                    <input type="number" id="user-jito-tip" placeholder="0.001" step="0.001" style="width: 100%; box-sizing: border-box; background: #0a0c10; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px; font-family: monospace; font-size: 0.8em; text-align: center;">
                                </div>
                                <div>
                                    <label style="font-size: 0.7em; color: #aaa;">Slippage Max (%)</label>
                                    <input type="number" id="user-slippage" placeholder="5" style="width: 100%; box-sizing: border-box; background: #0a0c10; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px; font-family: monospace; font-size: 0.8em; text-align: center;">
                                </div>
                            </div>
                        </div>

                        <!-- 3. GESTIONE RISCHIO -->
                        <div style="background: #161821; border: 1px solid #2d3142; border-left: 3px solid #ffaa00; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                            <strong style="color: #ffaa00; font-size: 0.85em; text-transform: uppercase;">⚖️ Risk Management</strong>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                                <div>
                                    <label style="font-size: 0.7em; color: #aaa;">Take Profit (%)</label>
                                    <input type="number" id="user-tp" placeholder="150" style="width: 100%; box-sizing: border-box; background: rgba(0, 230, 118, 0.1); border: 1px solid #00e676; color: #00e676; padding: 6px; border-radius: 4px; font-family: monospace; font-size: 0.8em; text-align: center; font-weight: bold;">
                                </div>
                                <div>
                                    <label style="font-size: 0.7em; color: #aaa;">Stop Loss (%)</label>
                                    <input type="number" id="user-sl" placeholder="-20" style="width: 100%; box-sizing: border-box; background: rgba(255, 77, 77, 0.1); border: 1px solid #ff4d4d; color: #ff4d4d; padding: 6px; border-radius: 4px; font-family: monospace; font-size: 0.8em; text-align: center; font-weight: bold;">
                                </div>
                            </div>
                        </div>

                        <button id="btn-save-config" style="width: 100%; background: linear-gradient(90deg, #00ffcc, #00b38f); color: #000; border: none; padding: 12px; border-radius: 6px; font-weight: 900; font-size: 0.9em; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s; box-shadow: 0 4px 15px rgba(0, 255, 204, 0.3);">
                            💾 Salva e Attiva
                        </button>
                    </div>

                    <!-- TAB 1: RADAR (CON TIMER ATTESA) -->
                    <div id="view-radar">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <div style="display: flex; align-items: center; gap: 8px; font-family: monospace; color: #00ffcc; font-size: 0.85em; background: #0a0c10; padding: 6px 10px; border-radius: 6px; border: 1px solid #1a1c29;">
                                <span>🎯 ${tokenMint.substring(0,12)}...</span>
                                <span id="mint-loading-status" style="color: #ffaa00; font-size: 0.85em; font-weight: bold; animation: pulseGlow 1.5s infinite;">⏳ Analisi...</span>
                            </div>
                            <button id="btn-ricarica" style="background: #161821; border: 1px solid #2d3142; color: #00ffcc; font-weight: bold; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.7em; text-transform: uppercase;">Ricarica</button>
                        </div>
                        ${copilotHTML}
                        ${orderFlowHTML}
                        ${liveTapeHTML}
                        <div id="static-analysis-box"></div>
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
                <div id="bottom-tabs-nav" style="display: flex; background: rgba(10, 12, 16, 0.95); backdrop-filter: blur(5px); border-top: 1px solid #1a1c29; height: 55px; flex-shrink: 0; z-index: 10;">
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
        inizializzaTracker();
        loadSavedWallets();
        caricaStoricoSpyNelDOM();
    }

    // =========================================================
    // 🎛️ EVENTI BASE E TABS
    // =========================================================
    function configuraEventiBase(tokenMint) {
        const tabs = ['radar', 'tracker', 'spy'];
        const viewUser = document.getElementById('view-user');
        const bottomNav = document.getElementById('bottom-tabs-nav');
        
        // 1. TABS STANDARD (In basso)
        function switchTab(activeId) {
            viewUser.style.display = 'none'; // Nasconde la User Dashboard
            bottomNav.style.display = 'flex'; // Mostra la barra inferiore
            document.getElementById('btn-user-profile').style.background = '#1a1c29'; // Resetta colore omino

            tabs.forEach(id => {
                document.getElementById(`view-${id}`).style.display = (id === activeId) ? 'block' : 'none';
                const tab = document.getElementById(`tab-${id}`);
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

        // 2. TOGGLE USER DASHBOARD (Omino in alto a destra)
        const btnUser = document.getElementById('btn-user-profile');
        if (btnUser) {
            btnUser.addEventListener('click', () => {
                const isUserOpen = viewUser.style.display === 'block';
                if (isUserOpen) {
                    switchTab('radar'); // Torna alla home
                } else {
                    tabs.forEach(id => document.getElementById(`view-${id}`).style.display = 'none');
                    viewUser.style.display = 'block';
                    bottomNav.style.display = 'none'; // Nascondi bottoni bassi
                    btnUser.style.background = '#00ffcc';
                }
            });
        }

        // 3. CARICA E SALVA CONFIGURAZIONI (Control Room)
        
        // Recuperiamo i link sicuri dentro questa funzione
        const av1 = chrome.runtime.getURL("avatar1.png");
        let selectedAvatarUrl = av1; // Usa la tua prima immagine come default!

        // Logica per cliccare e selezionare gli Avatar
        const avatarOptions = document.querySelectorAll('.avatar-option');
        avatarOptions.forEach(img => {
            img.addEventListener('click', (e) => {
                avatarOptions.forEach(opt => opt.classList.remove('active')); 
                e.target.classList.add('active'); 
                selectedAvatarUrl = e.target.getAttribute('data-src');
                document.getElementById('current-user-avatar').src = selectedAvatarUrl; 
            });
        });

        // Carica i dati salvati precedentemente...
        // (Il resto del codice di caricamento/salvataggio rimane identico!)

        // Carica i dati salvati precedentemente
        chrome.storage.local.get(['userConfig'], (res) => {
            if (res.userConfig) {
                if (document.getElementById('user-rpc-url')) document.getElementById('user-rpc-url').value = res.userConfig.rpcUrl || "";
                if (document.getElementById('user-private-key')) document.getElementById('user-private-key').value = res.userConfig.privateKey || "";
                if (document.getElementById('user-jito-tip')) document.getElementById('user-jito-tip').value = res.userConfig.jitoTip || "";
                if (document.getElementById('user-slippage')) document.getElementById('user-slippage').value = res.userConfig.slippage || "";
                if (document.getElementById('user-tp')) document.getElementById('user-tp').value = res.userConfig.takeProfit || "";
                if (document.getElementById('user-sl')) document.getElementById('user-sl').value = res.userConfig.stopLoss || "";
                
                // Ricarica l'avatar salvato
                if (res.userConfig.avatarUrl) {
                    selectedAvatarUrl = res.userConfig.avatarUrl;
                    document.getElementById('current-user-avatar').src = selectedAvatarUrl;
                    avatarOptions.forEach(opt => {
                        opt.classList.remove('active');
                        if (opt.getAttribute('data-src') === selectedAvatarUrl) opt.classList.add('active');
                    });
                }
            }
        });

        // Logica pulsante Salva: Effetto visivo e ritorno al Radar
        const btnSaveConfig = document.getElementById('btn-save-config');
        if (btnSaveConfig) {
            btnSaveConfig.addEventListener('click', () => {
                const newConfig = {
                    rpcUrl: document.getElementById('user-rpc-url').value.trim(),
                    privateKey: document.getElementById('user-private-key').value.trim(),
                    jitoTip: document.getElementById('user-jito-tip').value.trim(),
                    slippage: document.getElementById('user-slippage').value.trim(),
                    takeProfit: document.getElementById('user-tp').value.trim(),
                    stopLoss: document.getElementById('user-sl').value.trim(),
                    avatarUrl: selectedAvatarUrl
                };

                chrome.storage.local.set({ userConfig: newConfig }, () => {
                    // Animazione pulsante salvato
                    btnSaveConfig.style.background = '#00e676';
                    btnSaveConfig.innerHTML = '✅ SALVATO CON SUCCESSO!';
                    
                    if (newConfig.rpcUrl && typeof socket !== 'undefined') {
                        socket.emit('update_user_rpc', newConfig.rpcUrl);
                    }

                    // 🔙 TORNA AL RADAR IN AUTOMATICO DOPO 1 SECONDO
                    setTimeout(() => {
                        btnSaveConfig.style.background = 'linear-gradient(90deg, #00ffcc, #00b38f)';
                        btnSaveConfig.innerHTML = '💾 Salva e Attiva';
                        
                        // Simula il click sul tab radar e nasconde la dashboard
                        document.getElementById('tab-radar').click();
                        viewUser.style.display = 'none';
                        bottomNav.style.display = 'flex'; // Fa ricomparire la barra dei tab
                        
                    }, 1000); 
                });
            });
        }

        // 4. ALTRI BOTTONI E SOCKETS (Radar base)
        document.getElementById('btn-ricarica').addEventListener('click', () => {
            chrome.storage.local.remove(['ultimoTokenScansionato', 'ultimoRisultatoScan'], avviaRadar);
        });

        const btnCopilot = document.getElementById('btn-copilot');
        const copilotResult = document.getElementById('copilot-result');
        if (btnCopilot) {
            btnCopilot.addEventListener('click', async () => {
                btnCopilot.innerText = "⏳ Analisi in corso...";
                btnCopilot.style.background = "#555";
                btnCopilot.style.pointerEvents = "none";
                copilotResult.style.display = "block";
                copilotResult.innerHTML = "<span style='color:#888; display:block; text-align:center;'>Lettura parametri vitali...</span>";
                
                try {
                    const payloadDatiLive = window.liveMetrics || { buyVol: 0, sellVol: 0, buyPressure: 50 };
                    const resp = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/copilot/${tokenMint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', "ngrok-skip-browser-warning": "true" },
                        body: JSON.stringify(payloadDatiLive)
                    });
                    const dataResp = await resp.json();
                    
                    let tattica = dataResp.tattica || "⚠️ Errore AI";
                    let puntoRottura = dataResp.puntoRottura || "Dati illeggibili.";
                    let azione = dataResp.azione || "ATTESA";
                    let actionColor = azione.includes("FUGG") || azione.includes("VEND") ? "#ff4d4d" : (azione.includes("COMPR") ? "#00e676" : "#ffaa00");
                    
                    copilotResult.innerHTML = `
                        <div style="margin-bottom: 8px;"><strong style="color:#b366ff;">1. Tattica:</strong><br><span style="color:#e0e0e0;">${tattica}</span></div>
                        <div style="margin-bottom: 10px;"><strong style="color:#ffaa00;">2. Previsione:</strong><br><span style="color:#e0e0e0;">${puntoRottura}</span></div>
                        <div style="text-align: center; padding: 6px; border: 1px solid ${actionColor}; color: ${actionColor}; font-weight: bold; border-radius: 4px;">Azione Consigliata: ${azione}</div>
                    `;
                } catch(e) {
                    copilotResult.innerHTML = `<div style="text-align:center; color:#ff4d4d; font-weight:bold;">⚠️ Errore Copilota: ${e.message}</div>`;
                } finally {
                    btnCopilot.innerText = "🔄 Ri-analizza";
                    btnCopilot.style.background = "#b366ff";
                    btnCopilot.style.pointerEvents = "auto";
                }
            });
        }

        socket.off('nuovo_trade_live');
        socket.on('nuovo_trade_live', (trade) => {
            resettaTimerNoia();
            const tapeList = document.getElementById('live-tape-list');
            if (tapeList) {
                if (tapeList.innerHTML.includes('In ascolto')) tapeList.innerHTML = '';
                const isBuy = trade.tipo.includes("BUY");
                const color = isBuy ? "#00e676" : "#ff4d4d";
                const el = document.createElement('div');
                el.style.cssText = `font-family: monospace; font-size: 0.85em; color: ${color}; display: flex; justify-content: space-between; background: #161821; padding: 6px; border-radius: 4px; border-left: 3px solid ${color};`;
                
                el.innerHTML = `
                    <div style="display: flex; flex-direction: column; width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="font-weight: bold;">${trade.tipo} ${trade.sol} SOL</span>
                            <span title="${trade.zooTag}">${trade.zooIcon}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8em;">
                            <span style="color:#aaa;">${trade.wallet.substring(0,4)}...${trade.wallet.slice(-4)}</span>
                            <a href="${trade.solscan}" target="_blank" style="color: #4da6ff; text-decoration: none;">🔍 Solscan</a>
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

            window.liveMetrics = { history: window.liveMetrics.history, buyVol, sellVol, buyPressure };

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

        socket.off('spy_alert');
        socket.on('spy_alert', (data) => {
            const feed = document.getElementById('spy-feed-list');
            if (feed) {
                if (feed.innerHTML.includes('In attesa')) feed.innerHTML = '';
                const alertCard = document.createElement('div');
                alertCard.style.cssText = "background: #330000; border: 1px solid #ff0000; padding: 8px; margin-bottom: 6px; border-radius: 4px; font-family: monospace;";
                alertCard.innerHTML = `
                    <div style="color: #ff0000; font-weight: bold; font-size: 1.1em; border-bottom: 1px solid #ff4444; padding-bottom: 4px; margin-bottom: 6px;">
                        🚨 SYBIL DUMP RILEVATO
                    </div>
                    <div style="color: #e0e0e0; font-size: 0.9em; margin-bottom: 6px;">${data.messaggio}</div>
                `;
                feed.prepend(alertCard);
                const tabSpy = document.getElementById('tab-spy');
                if (tabSpy) { tabSpy.style.color = "#ff007f"; tabSpy.style.animation = "pulseRed 1s infinite"; }
            }
        });

        socket.off('autopsia_sniper_live');
        socket.on('autopsia_sniper_live', (data) => {
            const feed = document.getElementById('spy-feed-list');
            if (feed) {
                if (feed.innerHTML.includes('In attesa')) feed.innerHTML = '';
                const card = document.createElement('div');
                card.style.cssText = `background:#161821; border-top: 3px solid ${data.colore}; padding: 12px; border-radius:6px; margin-bottom:10px; box-shadow: 0 4px 6px rgba(0,0,0,0.5);`;
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="color:#b366ff; font-weight:bold; font-size:0.85em;">⚙️ Raggi X Quantitativi</span>
                        <span style="background:${data.colore}20; border:1px solid ${data.colore}; color:${data.colore}; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:0.7em;">${data.esito}</span>
                    </div>
                    <div style="color:#aaa; font-size:0.8em; margin-bottom:8px;">Wallet: <span style="color:#fff;">${data.walletSpia.substring(0,6)}...</span></div>
                    <div style="background:#0a0c10; border:1px solid #2d3142; padding:8px; border-radius:4px; font-size:0.85em; color:#e0e0e0; margin-bottom:10px;">${data.motivo}</div>
                    <div style="text-align:center;"><a href="https://pump.fun/${data.mint}" target="_blank" style="background:#222; border:1px solid #444; color:#00ffcc; padding:4px 8px; border-radius:4px; text-decoration:none; font-size:0.8em; font-weight:bold;">💊 Pump.fun</a></div>
                `;
                feed.prepend(card);
            }
        });
    }

    // =========================================================
    // 📊 DATI STATICI E CARDS 
    // =========================================================
    // =========================================================
    // 📊 DATI STATICI E CARDS 
    // =========================================================
    function popolaInterfacciaStatica(data, tokenMint) {
        
        // 1. INIETTA L'INDICE NEL PIANO INFERIORE (Senza toccare l'omino!)
        const hudStats = document.getElementById('hud-stats-container');
        if (hudStats && data.hud) {
            document.getElementById('hud-header').style.borderBottom = `2px solid ${data.hud.color}`;
            hudStats.style.display = 'flex'; // Fa comparire magicamente la sezione
            hudStats.innerHTML = `
                <div>
                    <div style="font-size: 0.6em; color: #888; text-transform: uppercase; letter-spacing: 1px;">Solana Memecoin Index</div>
                    <div style="font-size: 1.1em; font-weight: 900; color: ${data.hud.color};">${data.hud.icon} ${data.hud.change >= 0 ? '+' : ''}${data.hud.change}% <span style="font-size: 0.6em; color: #aaa;">Vol: $${data.hud.volume}M</span></div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.6em; color: #888; text-transform: uppercase; letter-spacing: 1px;">Trend</div>
                    <div style="font-size: 0.75em; font-weight: bold; color: ${data.hud.color};">${data.hud.trend}</div>
                </div>`;
        }

        // 2. FASE 2 DEL TIMER: Dati base caricati!
        const mintStatus = document.getElementById('mint-loading-status');
        if (mintStatus) {
            mintStatus.innerHTML = `✅ Dati Base`;
            mintStatus.style.color = `#00e676`;
            mintStatus.style.animation = `none`;
        }

        // 3. AUTOSPIA BUNDLE & DEV
        const staticBox = document.getElementById('static-analysis-box');
        if (!staticBox) return;
        
        let reportHTML = "";
        if (data.advice) {
            // OVERRIDE FRONTEND: IL DEV GIOVANE E' SCAM
            let devText = data.advice.devStatus || "";
            let devColor = '#00ffcc'; 
            let devIcon = '👨‍💻';
            
            if (devText.toUpperCase().match(/GIOVAN|FRESH|GIORNI|DAYS|NEW/)) {
                devColor = '#ff4d4d'; 
                devIcon = '🚨';
                devText += " <br><span style='color:#ff4d4d; font-size:0.85em; font-weight:bold;'>⚠️ ALTO RISCHIO RUG (Wallet creato apposta).</span>";
            } else if (devText.toUpperCase().match(/SERIAL|FARMER/)) {
                devColor = '#ffaa00'; 
                devIcon = '⚠️';
            }

            // OVERRIDE FRONTEND: 0% HOLDER = BUNDLE NASCOSTO
            let bundleText = data.advice.topHoldersStatus || "";
            let bundleColor = bundleText.match(/ATTENZIONE|RISCHIO|0%/) ? '#ffaa00' : '#00ffcc';
            
            if (bundleText.includes('0%')) {
                bundleColor = '#ffaa00'; 
                bundleText += " <br><span style='color:#ffaa00; font-size:0.85em; font-weight:bold;'>⚠️ Rischio BUNDLE: il dev potrebbe aver cecchinato le prime candele in segreto!</span>";
            }
            
            reportHTML += `
                <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 15px;">
                    <div style="background: linear-gradient(90deg, ${devColor}20, transparent); border-left: 4px solid ${devColor}; padding: 10px; border-radius: 4px; border: 1px solid #1a1c29;">
                        <div style="font-size: 0.7em; color: ${devColor}; text-transform: uppercase; font-weight: 900; margin-bottom: 4px; letter-spacing: 1px;">${devIcon} Storico Sviluppatore</div>
                        <div style="font-size: 0.85em; color: #e4e4e7; font-family: monospace;">${devText}</div>
                    </div>
                    <div style="background: linear-gradient(90deg, ${bundleColor}20, transparent); border-left: 4px solid ${bundleColor}; padding: 10px; border-radius: 4px; border: 1px solid #1a1c29;">
                        <div style="font-size: 0.7em; color: ${bundleColor}; text-transform: uppercase; font-weight: 900; margin-bottom: 4px; letter-spacing: 1px;">🛡️ Analisi Supply</div>
                        <div style="font-size: 0.85em; color: #e4e4e7; font-family: monospace;">${bundleText}</div>
                    </div>
                </div>`;
        }
        staticBox.innerHTML = reportHTML;
    }
    // =========================================================
    // ⚖️ IL GIUDICE SUPREMO
    // =========================================================
    async function avviaLaboratorioGemini(tokenMint) {
        let container = document.getElementById('gemini-report-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'gemini-report-container';
            container.style.cssText = `
                background: rgba(18, 10, 25, 0.9); padding: 12px; border-radius: 8px; margin-bottom: 15px; 
                border: 1px solid #c084fc; box-shadow: inset 0 0 10px rgba(192, 132, 252, 0.15);
            `;
            const staticBox = document.getElementById('static-analysis-box');
            if (staticBox) staticBox.parentNode.insertBefore(container, staticBox);
        }

        // 🔥 CRONOMETRO IN TEMPO REALE
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 0.75em; color: #c084fc; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">⚖️ Giudice Supremo</span>
                <span id="judge-timer" style="background:#4a2b66; color:#fff; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.8em; font-weight:bold;">0.0s</span>
            </div>
            <div style="text-align: center; padding: 10px; color: #c084fc;">
                <span style="animation: pulseGlow 1.5s infinite; font-weight:bold;">⏳ Indagine forense in corso...</span>
                <div style="font-size: 0.75em; color: #888; margin-top: 6px;">Elaborazione dati IA (attesa stimata: 5-8s)</div>
            </div>
        `;

        let sec = 0;
        const timerInterval = setInterval(() => {
            sec += 0.1;
            const timerEl = document.getElementById('judge-timer');
            if(timerEl) timerEl.innerText = sec.toFixed(1) + 's';
        }, 100);

        try {
            const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/laboratorio/${tokenMint}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            const data = await response.json();
            
            clearInterval(timerInterval); // Ferma il cronometro

            if (data.success) {
                container.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 0.75em; color: #c084fc; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">⚖️ Verdetto Giudice</span>
                        <div style="display:flex; gap: 6px; align-items:center;">
                            <span style="color:#888; font-family:monospace; font-size:0.7em;">Fatto in ${sec.toFixed(1)}s</span>
                            <button id="btn-refresh-judge" style="background: #c084fc; color: #000; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.7em;">🔄</button>
                        </div>
                    </div>
                    ${data.verdetto}
                `;
                document.getElementById('btn-refresh-judge').addEventListener('click', () => avviaLaboratorioGemini(tokenMint));
            } else {
                container.innerHTML = `<div style="color:#ff4d4d; padding:10px;">⚠️ Errore AI: ${data.verdetto}</div>`;
            }
        } catch (error) {
            clearInterval(timerInterval);
            container.innerHTML = `<div style="color:#ff4d4d; padding:10px;">❌ Errore di connessione al Giudice.</div>`;
        }
    }

    // =========================================================
    // 💼 LOGICA SMART MONEY TRACKER E SPY
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
            if (e.target.classList.contains('toggle-spy-btn')) {
                const wallet = e.target.getAttribute('data-wallet');
                chrome.storage.local.get(['spiedWallets'], (res) => {
                    let spied = res.spiedWallets || [];
                    if (spied.includes(wallet)) spied = spied.filter(w => w !== wallet); 
                    else spied.push(wallet); 
                    chrome.storage.local.set({ spiedWallets: spied }, () => loadSavedWallets());
                });
            }
        });
    }

    function loadSavedWallets() {
        const listContainer = document.getElementById('tracked-wallets-list');
        if (!listContainer) return; 
        
        chrome.storage.local.get(['trackedWallets', 'walletNames', 'spiedWallets'], function(result) {
            const wallets = result.trackedWallets || [];
            const walletNames = result.walletNames || {};
            const spiedWallets = result.spiedWallets || [];
            listContainer.innerHTML = ''; 

            if(socket) socket.emit('imposta_wallet_spia', spiedWallets);

            wallets.forEach(wallet => {
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
                            <button class="delete-wallet-btn" data-wallet="${wallet}" style="background:#362424; border:1px solid #583a3a; color:#ff4d4d; border-radius:4px; padding:3px 6px; cursor:pointer;">🗑️</button>
                        </div>
                    </div>
                `;
                listContainer.appendChild(walletItem);
            });
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
                    <span style="background:#2a2d3d; padding:4px 8px; border-radius:4px; border:1px solid #444; color:#fff;">${data.stats.classificazione || 'Analisi...'}</span>
                </div>
            `;
        }

        if (isBuy && data.strategy) {
            const solText = data.solSpent > 0.01 ? `${data.solSpent.toFixed(2)} SOL` : `Nascosto`;
            contentHTML = `
                <div style="background:#11121a; border-left: 3px solid ${data.strategy.color}; padding:8px; border-radius:4px; margin-bottom:10px; font-size:0.85em;">
                    <strong style="color:${data.strategy.color};">${data.strategy.conviction}</strong><br>
                    <span style="color:#aaa;">Investimento: <b style="color:#fff;">${solText}</b></span>
                </div>
            `;
        } else if (!isBuy) {
            contentHTML = `
                <div style="background:rgba(255, 77, 77, 0.1); padding:8px; border-radius:4px; margin-bottom:12px; font-size:0.85em; color:#ff4d4d; border: 1px solid #ff4d4d;">
                    📉 Uscita dalla posizione
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
                <div style="font-family:monospace; font-size:0.95em; color:#fff;">${data.mint.substring(0,16)}...</div>
                <button class="copy-spy-mint-btn" data-mint="${data.mint}" style="background:#2a2d3d; border:1px solid #444; color:#fff; border-radius:4px; cursor:pointer; padding:4px 8px; font-weight:bold; font-size:0.8em;">📋 Copia</button>
            </div>
            ${contentHTML}
            <div style="text-align:center;">
                <a href="https://pump.fun/${data.mint}" target="_blank" style="background:#222; border: 1px solid #444; color:#00ffcc; padding:6px; border-radius:4px; text-decoration:none; font-size:0.8em; font-weight:bold; display:block;">💊 Pump.fun</a>
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
    }

    function salvaStoricoSpy(alertData) {
        return new Promise((resolve) => {
            chrome.storage.local.get(['spyHistory'], (res) => {
                let history = res.spyHistory || [];
                if (history.some(h => h.signature === alertData.signature)) return resolve(false);
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
                                type: action.type, mint: action.mint, signature: action.signature,
                                walletAddress: wallet, walletName: names[wallet] || `${wallet.substring(0,4)}...`,
                                solSpent: action.solSpent, strategy: action.strategy, stats: data.walletStats
                            };
                            const isNew = await salvaStoricoSpy(alertData);
                            if (isNew) aggiungiSpyCardHTML(alertData, true);
                        }
                    }
                } catch (e) {}
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

    async function startSpyLoop() {
        try { await checkSpyWallets(); } catch (e) {} 
        finally { setTimeout(startSpyLoop, 15000); }
    }

    // =========================================================
    // START SCRIPT
    // =========================================================
    avviaRadar();
    startSpyLoop();
});