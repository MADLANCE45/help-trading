// =========================================================
// 🚀 ROUTER INTELLIGENTE (Previene l'ologramma nel popup)
// =========================================================
function lanciaOlogrammaIntelligente(copilotData, staticData, avatarUrl, liveMetricsData) {
    // 🛡️ SCUDO BULLETPROOF: Controlla l'ID univoco dell'estensione
    const isPopup = window.location.href.includes(chrome.runtime.id) || window.location.protocol.includes('extension');
    
    if (isPopup) {
        if (chrome.tabs && chrome.tabs.query) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs && tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "INJECT_HOLOGRAM",
                        copilotData: copilotData,
                        staticData: staticData,
                        avatarUrl: avatarUrl,
                        liveMetrics: liveMetricsData
                    });
                }
            });
        }
    } else {
        mostraOlogrammaTatticoSulSito(copilotData, staticData, avatarUrl, liveMetricsData);
    }
}

// =========================================================
// 🔮 HOLOGRAM INJECTION ENGINE (Veto + Anti-FOMO + Zero Lag)
// =========================================================
function mostraOlogrammaTatticoSulSito(copilotData, staticData, avatarUrl, liveMetricsData) {
    
    // 🛡️ SCUDO ASSOLUTO ANTI-POPUP
    const isPopup = window.location.href.includes(chrome.runtime.id) || window.location.protocol.includes('extension');
    if (isPopup) {
        console.log("🛡️ Ologramma bloccato: non può spawnare dentro l'estensione.");
        return;
    }
    
    chrome.storage.local.get(['userConfig'], (res) => {
        if (res.userConfig && res.userConfig.holoEnabled === false) return; 
        
        // 📍 POSIZIONE AGGIORNATA: Spostato in basso di circa 5 cm
        let posCss = `left: 30px; top: 350px;`; 
        
        let oldHolo = document.getElementById('ms-hologram-wrapper');
        if (oldHolo) {
            const rect = oldHolo.getBoundingClientRect();
            posCss = `left: ${rect.left}px; top: ${rect.top}px;`; 
            oldHolo.remove();
        }

        const baseStaticScore = staticData && staticData.score ? staticData.score : 50;
        const baseAction = (copilotData.azione || "").toUpperCase();

        function elaboraVerdetto(metrics) {
            const isEVM = staticData && staticData.isEVM === true;
            let hasVolume = metrics && (parseFloat(metrics.buyVol) > 0 || parseFloat(metrics.sellVol) > 0);
            let currentFlow = hasVolume ? parseFloat(metrics.buyPressure) : -1; 
            
            let recentBuyVol = metrics ? parseFloat(metrics.buyVol) || 0 : 0;
            let isOverboughtAnomaly = (recentBuyVol >= 8 && currentFlow >= 80);

            let tacticalScore = baseStaticScore;

            if (currentFlow !== -1) {
                let flowDiff = currentFlow - 50; 
                let amplifiedFlow = 50 + (flowDiff * 1.8); 
                amplifiedFlow = Math.min(99, Math.max(1, amplifiedFlow));
                tacticalScore = baseStaticScore <= 40 ? baseStaticScore : (baseStaticScore * 0.15) + (amplifiedFlow * 0.85);
            } else if (!isEVM) {
                // Riduciamo lo score per inattività solo su Solana
                tacticalScore = baseStaticScore * 0.8; 
            }

            tacticalScore = Math.floor(Math.min(100, Math.max(0, tacticalScore)));

            let isDanger = tacticalScore <= 45;
            let isSafe = tacticalScore >= 65 && !isOverboughtAnomaly;
            
            const baseAction = (copilotData && copilotData.azione ? copilotData.azione : "").toUpperCase();
            if (baseAction.match(/AVOID|DUMP|SELL|FUGG/)) isDanger = true;
            if (baseAction.match(/RIDE|BUY/) && !isDanger) isSafe = true;

            let mainColor = isDanger ? '#ff4d4d' : (isSafe ? '#00e676' : '#ffaa00');
            let bgColor = isDanger ? 'rgba(30, 0, 0, 0.95)' : (isSafe ? 'rgba(0, 20, 10, 0.95)' : 'rgba(30, 20, 0, 0.95)');
            
            let text = "";
            
            // 1. Priorità assoluta al Copilot
            if (copilotData && copilotData.tattica && copilotData.puntoRottura) {
                text = `[COPILOT_AI] ${copilotData.tattica} | ${copilotData.puntoRottura}`;
                if (baseAction.match(/RIDE|BUY/)) { mainColor = '#00e676'; bgColor = 'rgba(0, 20, 10, 0.95)'; }
                else if (baseAction.match(/AVOID|DUMP/)) { mainColor = '#ff4d4d'; bgColor = 'rgba(30, 0, 0, 0.95)'; }
            } 
            // 2. Messaggi Custom (Vampire Watcher)
            else if (copilotData && copilotData.messaggioCustom) {
                text = copilotData.messaggioCustom;
                mainColor = '#ffaa00'; bgColor = 'rgba(30, 20, 0, 0.95)';
            } 
            // 3. Logica EVM (Nessun WSS)
            else if (isEVM) {
                text = staticData.rawVerdict || `[EVM_METRICS] Market Cap: $${((staticData.targetMC || 0)/1.4/1000).toFixed(1)}k. Heuristic momentum active.`;
            } 
            // 4. Logica Solana (Con WSS)
            else if (copilotData && copilotData.tattica === "VAMPIRE BLEED DETECTED") {
                text = `[VAMPIRE_ALERT] Sudden drop in buy pressure detected. Trust Score dropping to ${tacticalScore}/100. Brace for impact.`;
            } else if (isOverboughtAnomaly) {
                text = `[OVERBOUGHT_ANOMALY] Massive bundle pump detected. Imminent dump probable. DO NOT FOMO.`;
                mainColor = '#ffaa00'; bgColor = 'rgba(30, 20, 0, 0.95)';
                isSafe = false; isDanger = false;
            } else if (currentFlow === -1) {
                text = `[DEAD_TAPE] Volume flatlined. No transactions in the last 10s. Market makers withdrew liquidity. Awaiting pulse...`;
                mainColor = '#888'; bgColor = 'rgba(20, 20, 20, 0.95)';
                isSafe = false; isDanger = false;
            } else if (isDanger) {
                text = `[SEVERE_BLEED] Order flow collapsing (${currentFlow.toFixed(0)}% Buy). Sellers dominating the tape. Exit immediately.`;
            } else if (isSafe) {
                text = `[PARABOLIC_MOMENTUM] Tape is hyper-bullish (${currentFlow.toFixed(0)}% Buy). Aggressive accumulation. Ride the trend.`;
            } else {
                text = `[NEUTRAL_CHOP] Market undecided (${currentFlow.toFixed(0)}% Buy). Monitor for breakout.`;
            }

            return { text, mainColor, bgColor, isDanger, isSafe, tacticalScore };
        }

        let currentState = elaboraVerdetto(liveMetricsData);

        if (!document.getElementById('ms-holo-styles')) {
            const style = document.createElement('style');
            style.id = 'ms-holo-styles';
            style.innerHTML = `
                @keyframes holoFloat { 0% { transform: translateY(0px); } 50% { transform: translateY(-5px); } 100% { transform: translateY(0px); } }
                @keyframes slideInLeftHolo { 0% { transform: translateX(-50px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
                .holo-inner-animated { animation: holoFloat 4s ease-in-out infinite; }
                .holo-drag-handle { cursor: grab; }
                .holo-drag-handle:active { cursor: grabbing; }
                .holo-btn-interactive { pointer-events: auto !important; cursor: pointer; transition: 0.2s; position: relative; z-index: 100; }
                .holo-btn-interactive:hover { filter: brightness(1.3); transform: scale(1.05); }
            `;
            document.head.appendChild(style);
        }

        const wrapper = document.createElement('div');
        wrapper.id = 'ms-hologram-wrapper';
        wrapper.style.cssText = `
            position: fixed;
            ${posCss}
            z-index: 2147483647;
            pointer-events: none; 
            animation: slideInLeftHolo 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        wrapper.innerHTML = `
            <div class="holo-inner-animated" style="display: flex; gap: 15px; width: 420px; pointer-events: auto; user-select: none;">
                
                <div class="holo-drag-handle" style="flex-shrink: 0; width: 85px; height: 85px; border-radius: 50%; border: 2px solid ${currentState.mainColor}; box-shadow: 0 0 25px ${currentState.mainColor}; overflow: hidden; background: #000; position: relative;">
                    <img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover; filter: contrast(1.2) grayscale(0.1);" draggable="false"/>
                    <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 3px, rgba(0,0,0,0.3) 3px);"></div>
                </div>

                <div id="ms-holo-panel" class="holo-drag-handle" style="flex-grow: 1; background: ${currentState.bgColor}; border: 1px solid ${currentState.mainColor}; border-radius: 4px; padding: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(0,0,0,0.6); backdrop-filter: blur(10px); position: relative; border-left: 4px solid ${currentState.mainColor}; transition: border 0.3s, background 0.3s;">
                    
                    <div style="position: absolute; top:0; left:0; width:100%; height:14px; background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center;">
                        <div style="width:30px; height:2px; background: #555; border-radius:2px;"></div>
                    </div>

                    <div style="position: absolute; left: -11px; top: 32px; width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-right: 10px solid ${currentState.mainColor};" id="ms-holo-arrow-out"></div>
                    <div style="position: absolute; left: -9px; top: 32px; width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-right: 10px solid ${currentState.bgColor};" id="ms-holo-arrow-in"></div>

                    <div style="font-family: monospace; font-size: 0.75em; color: ${currentState.mainColor}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; border-bottom: 1px dashed ${currentState.mainColor}; padding-bottom: 4px; display:flex; justify-content:space-between; align-items: center; margin-top: 5px;" id="ms-holo-header">
                        <span>[SYS.OP] SCORE: <span id="ms-holo-score">${currentState.tacticalScore.toFixed(0)}</span></span>
                        
                        <button id="ms-btn-refresh-holo" class="holo-btn-interactive" style="background: transparent; border: 1px solid ${currentState.mainColor}; color: ${currentState.mainColor}; border-radius: 4px; padding: 4px 10px; font-weight: bold; font-family: monospace; font-size: 0.85em; box-shadow: inset 0 0 5px ${currentState.mainColor}40;" title="Refresh Data">RE-SCAN</button>
                    </div>
                    
                    <div id="ms-typing-text" style="font-family: 'Courier New', Courier, monospace; font-size: 0.85em; color: #e4e4e7; line-height: 1.5; min-height: 70px; text-shadow: 0 0 5px ${currentState.mainColor}40;"></div>
                    
                    <div style="margin-top: 15px; height: 16px; position: relative; display: flex; align-items: center;">
                        <div id="ms-holo-line" style="flex-grow: 1; height: 1px; background: repeating-linear-gradient(90deg, ${currentState.mainColor} 0, ${currentState.mainColor} 6px, transparent 6px, transparent 12px); opacity: 0.7;"></div>
                        <button id="ms-btn-action-holo" class="holo-btn-interactive" style="background: ${currentState.mainColor}; color: #000; border: none; font-weight: 900; font-family: monospace; font-size: 0.75em; padding: 4px 10px; border-radius: 2px; margin-left: 8px; box-shadow: 0 0 10px ${currentState.mainColor}80;">
                            ${currentState.isDanger ? 'ACKNOWLEDGE DUMP' : (currentState.isSafe ? 'EXECUTE RIDE' : 'ACKNOWLEDGE SCALP')}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const dragHandles = wrapper.querySelectorAll('.holo-drag-handle');
        dragHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                if (e.target.closest('.holo-btn-interactive')) return; 
                
                isDragging = true;
                const rect = wrapper.getBoundingClientRect();
                startX = e.clientX;
                startY = e.clientY;
                initialLeft = rect.left;
                initialTop = rect.top;
                
                wrapper.style.right = 'auto';
                wrapper.style.bottom = 'auto';
                wrapper.style.left = initialLeft + 'px';
                wrapper.style.top = initialTop + 'px';
                wrapper.style.transition = 'none';
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            let newLeft = initialLeft + (e.clientX - startX);
            let newTop = initialTop + (e.clientY - startY);
            
            const maxX = window.innerWidth - wrapper.offsetWidth;
            const maxY = window.innerHeight - wrapper.offsetHeight;
            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;
            if (newLeft > maxX) newLeft = maxX;
            if (newTop > maxY) newTop = maxY;

            requestAnimationFrame(() => {
                wrapper.style.left = `${newLeft}px`;
                wrapper.style.top = `${newTop}px`;
            });
        });

        document.addEventListener('mouseup', () => { 
            if (isDragging) {
                isDragging = false; 
                wrapper.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            }
        });

        const textElement = document.getElementById('ms-typing-text');
        let i = 0;
        let activeTypewriter = null;

        function startTypeWriter(testoDaScrivere) {
            textElement.innerHTML = "";
            i = 0;
            if (activeTypewriter) clearTimeout(activeTypewriter);
            
            function typeWriter() {
                if (i < testoDaScrivere.length) {
                    textElement.innerHTML += testoDaScrivere.substring(i, i + 3);
                    i += 3;
                    activeTypewriter = setTimeout(typeWriter, 5);
                }
            }
            typeWriter();
        }
        
        startTypeWriter(currentState.text);

        let autoDestructTimer;
        function chiudiOlogramma(e) {
            if(e) e.stopPropagation();
            if (wrapper && document.body.contains(wrapper)) {
                clearTimeout(autoDestructTimer);
                wrapper.style.opacity = '0';
                wrapper.style.transform = `translateY(-20px)`; 
                setTimeout(() => wrapper.remove(), 300);
            }
        }

        wrapper.querySelector('#ms-btn-action-holo').addEventListener('click', chiudiOlogramma);
        
        wrapper.querySelector('#ms-btn-refresh-holo').addEventListener('click', (e) => {
            e.stopPropagation();
            currentState = elaboraVerdetto(window.liveMetrics); 
            
            document.getElementById('ms-holo-panel').style.background = currentState.bgColor;
            document.getElementById('ms-holo-panel').style.borderColor = currentState.mainColor;
            document.getElementById('ms-holo-arrow-out').style.borderRightColor = currentState.mainColor;
            document.getElementById('ms-holo-arrow-in').style.borderRightColor = currentState.bgColor;
            document.getElementById('ms-holo-header').style.color = currentState.mainColor;
            document.getElementById('ms-holo-header').style.borderBottomColor = currentState.mainColor;
            document.getElementById('ms-holo-score').innerText = currentState.tacticalScore.toFixed(0);
            document.getElementById('ms-holo-line').style.background = `repeating-linear-gradient(90deg, ${currentState.mainColor} 0, ${currentState.mainColor} 6px, transparent 6px, transparent 12px)`;
            
            const btnAction = document.getElementById('ms-btn-action-holo');
            btnAction.style.background = currentState.mainColor;
            btnAction.style.boxShadow = `0 0 10px ${currentState.mainColor}80`;
            btnAction.innerText = currentState.isDanger ? 'ACKNOWLEDGE DUMP' : (currentState.isSafe ? 'EXECUTE RIDE' : 'ACKNOWLEDGE SCALP');

            textElement.innerHTML = `<span style="color:#00ffcc; text-transform: uppercase;">[ SYSTEM_RECALCULATING_MATRIX... ]</span>`;
            setTimeout(() => { startTypeWriter(currentState.text); }, 600);

            clearTimeout(autoDestructTimer);
            autoDestructTimer = setTimeout(chiudiOlogramma, 20000);
        });

        autoDestructTimer = setTimeout(chiudiOlogramma, 20000);
    }); 
}
// =========================================================
// 👁️ MATRIX WATCHER (Auto-Scan Reattivo per Pattern da Giungla)
// =========================================================
if (typeof window.matrixWatcher === 'undefined') {
    window.matrixWatcher = true;
    window.lastKnownPressure = 50;
    window.lastKnownVol = 0;
    window.holoCooldown = 0;
    window.matrixWarmupTicks = 0; // 🔥 Nuovo contatore di riscaldamento

    setInterval(() => {
        if (!window.liveMetrics) return;
        
        // 🔥 FIX 2: FASE DI RISCALDAMENTO (Warm-up)
        // Il bot aspetta 4 cicli (circa 16 secondi) prima di fare paragoni sul nuovo token.
        // Questo impedisce allarmi falsi dovuti al caricamento iniziale dei dati incrociati.
        if (window.matrixWarmupTicks < 4) {
            window.matrixWarmupTicks++;
            window.lastKnownPressure = parseFloat(window.liveMetrics.buyPressure) || 50;
            window.lastKnownVol = (parseFloat(window.liveMetrics.buyVol) || 0) + (parseFloat(window.liveMetrics.sellVol) || 0);
            return; // Usciamo senza calcolare allarmi
        }
        
        const currentPressure = parseFloat(window.liveMetrics.buyPressure) || 50;
        const currentVol = (parseFloat(window.liveMetrics.buyVol) || 0) + (parseFloat(window.liveMetrics.sellVol) || 0);
        
        const deltaPressure = window.lastKnownPressure - currentPressure;
        const isSpamming = (Date.now() - window.holoCooldown < 45000); 
        
        let alertData = null;

        if (!isSpamming) {
            // 1. VAMPIRE BLEED (Il manipolatore scarica lentamente liquidità)
            // 🔥 Aggiunta condizione: il crollo deve avvenire su un volume significativo (> 0.5 SOL) 
            // per evitare falsi allarmi su micro-vendite di retail spaventati.
            if (deltaPressure >= 25 && currentVol >= 0.5) {
                alertData = { 
                    azione: "DUMP", 
                    tattica: "VAMPIRE BLEED DETECTED", 
                    messaggioCustom: "[VAMPIRE_ALERT] Sudden drop in buy pressure. The manipulator is quietly draining liquidity. Brace for impact." 
                };
            }
            // 2. THE AMBUSH / TAPE PAINTING (Da 0 transazioni a un'esplosione isolata per disegnare la candela)
            else if (window.lastKnownVol === 0 && currentVol >= 0.5 && currentVol <= 5) {
                alertData = { 
                    azione: "WAIT", 
                    tattica: "AMBUSH / TAPE PAINTING", 
                    messaggioCustom: "[AMBUSH_DETECTED] Tape woke up instantly. The manipulator is printing a fake green candle to trigger retail FOMO. Do not bite the bait." 
                };
            }
            // 3. MEV BAITING (Transazioni microscopiche su nastro morto per testare i bot)
            else if (window.lastKnownVol === 0 && currentVol > 0 && currentVol < 0.05) {
                alertData = { 
                    azione: "WAIT", 
                    tattica: "LIQUIDITY TEST", 
                    messaggioCustom: "[MEV_BAIT] Micro-transaction detected. The Dev is pinging the pool to map active sniper bots before making a move. Standby." 
                };
            }
        }

        if (alertData) {
            chrome.storage.local.get(['userConfig', 'ultimoRisultatoScan'], (res) => {
                if (res.userConfig && res.userConfig.holoEnabled === false) return; 
                const avatar = res.userConfig?.avatarUrl || chrome.runtime.getURL("avatar1.png");
                
                lanciaOlogrammaIntelligente(alertData, res.ultimoRisultatoScan, avatar, window.liveMetrics); 
            });
            window.holoCooldown = Date.now();
        }
        
        window.lastKnownPressure = currentPressure;
        window.lastKnownVol = currentVol;
    }, 4000); 
}
// 📩 ASCOLTATORE DI MESSAGGI (Riceve il comando di scatto dal popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "INJECT_HOLOGRAM") {
        // 🛡️ DOPPIA SICUREZZA: Ignora i messaggi se ci troviamo nel popup
        const isPopup = window.location.href.includes(chrome.runtime.id) || window.location.protocol.includes('extension');
        if (isPopup) return;
        
        window.holoCooldown = Date.now(); 
        mostraOlogrammaTatticoSulSito(request.copilotData, request.staticData, request.avatarUrl, request.liveMetrics);
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');
    const masterApp = document.getElementById('master-app');

    // ==========================================
    // 🔍 CONTROLLO ZOOM
    // ==========================================
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    let currentZoom = parseFloat(localStorage.getItem('userZoom')) || 1;

    function applicaZoom() {
        if (!masterApp) return;
        document.body.style.zoom = currentZoom;
    }
    applicaZoom(); 

    if (btnZoomIn && btnZoomOut) {
        btnZoomIn.addEventListener('click', () => {
            if (currentZoom < 1.4) {
                currentZoom += 0.1;
                localStorage.setItem('userZoom', currentZoom);
                applicaZoom();
            }
        });
        btnZoomOut.addEventListener('click', () => {
            if (currentZoom > 0.8) {
                currentZoom -= 0.1;
                localStorage.setItem('userZoom', currentZoom);
                applicaZoom();
            }
        });
    }

    // 🔥 1. CONNESSIONE WEBSOCKET
    const socket = io("https://help-trading-production.up.railway.app", {});
    socket.on("connect", () => console.log(" Connesso al Radar Quantitativo WSS"));
    
    // =========================================================
    // 🚀 GOLDEN ALERT (Popup Intelligente)
    // =========================================================
    if (typeof window.whaleCooldown === 'undefined') window.whaleCooldown = new Set();

    socket.off('golden_signal_found'); 
    socket.on('golden_signal_found', async (segnale) => {
        const actualMint = typeof segnale === 'string' ? segnale : (segnale.mint || "Errore_Mint");
        
        if (window.whaleCooldown.has(actualMint)) return;
        
        window.whaleCooldown.add(actualMint);
        setTimeout(() => window.whaleCooldown.delete(actualMint), 120000);

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

        const solSpesi = segnale.solSpent || segnale.buyVol;
        const solText = solSpesi ? `${solSpesi} SOL` : `<span style="color:#aaa; font-size:0.9em;">Lettura WSS...</span>`;

        alertBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(0, 255, 204, 0.3); padding-bottom:8px; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap: 8px;">
                    <span style="font-size: 1.2em;">🚨</span>
                    <span style="color:#00ffcc; font-weight:900; font-size:1em; letter-spacing: 1px;">${t('whale_title')}</span>
                </div>
                <button id="close-golden-alert" style="background:transparent; border:none; color:#888; cursor:pointer; font-weight:bold; font-size:1.2em;">✕</button>
            </div>
            
            <div id="golden-stats-${actualMint}" style="background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 10px; margin-bottom: 10px; font-family: monospace; font-size: 0.85em; min-height: 70px;">
                <div style="text-align: center; color: #888; font-size: 0.9em; margin-top: 15px; animation: pulseGlow 1s infinite;">🔄 ${t('loading_analysis')}</div>
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
                <button id="copy-golden-mint" style="background: #2a2d3d; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.8em; font-weight: bold; flex: 1; transition: 0.2s;">${t('copy_mint')}</button>
                <a href="https://pump.fun/${actualMint}" target="_blank" style="flex: 2; text-align:center; background: linear-gradient(90deg, #00ffcc, #00b38f); color:#000; text-decoration:none; padding:8px; border-radius:6px; font-weight:900; font-size: 0.85em; letter-spacing:1px; box-shadow: 0 4px 10px rgba(0, 255, 204, 0.3);">
                    ${t('open_pump')}
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
        
        try {
            const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${actualMint}`);
            const dexData = await dexRes.json();
            const pair = (dexData.pairs && dexData.pairs.length > 0) ? dexData.pairs[0] : null;
            
            const statsContainer = document.getElementById(`golden-stats-${actualMint}`);
            
            if (statsContainer && pair) {
                const mc = pair.fdv || pair.marketCap || 0;
                const liq = pair.liquidity?.usd || 0;
                
                let liqRow = `<div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span style="color:#888;">Liquidità:</span> <span style="color:#fff; font-weight:bold;">$${liq.toLocaleString()}</span></div>`;
                if (liq === 0 && mc > 0) {
                    const curvePercent = Math.min(100, (mc / 80000) * 100).toFixed(1);
                    liqRow = `<div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span style="color:#888;">${t('curve_title')}</span> <span style="color:#c084fc; font-weight:bold;">${curvePercent}${t('curve_completed')}</span></div>`;
                }

                statsContainer.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span style="color:#888;">${t('action')}</span> <span style="color:#00ffcc; font-weight:bold;">${t('whale_buy')}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span style="color:#888;">Market Cap:</span> <span style="color:#fff; font-weight:bold;">$${mc.toLocaleString()}</span></div>
                    ${liqRow}
                    <div style="display:flex; justify-content:space-between;"><span style="color:#888;">Vol 5m:</span> <span style="color:#ffaa00; font-weight:bold;">$${(pair.volume?.m5 || 0).toLocaleString()}</span></div>
                `;
            } else if (statsContainer) {
                statsContainer.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom: 6px;"><span style="color:#888;">${t('action')}</span> <span style="color:#00ffcc; font-weight:bold;">${t('whale_buy')}</span></div>
                    <div style="text-align:center; padding: 6px; background: rgba(255, 77, 77, 0.2); border: 1px solid #ff4d4d; border-radius: 4px; color:#ff4d4d; font-size:0.85em; font-weight: bold;">
                        ${t('whale_new')}<br><span style="font-size:0.8em; color:#e0e0e0; font-weight:normal;">${t('whale_inv')}</span>
                    </div>
                `;
            }
        } catch(e) {}
    });

    let orderFlowWindow = [];
    window.liveMetrics = { history: [], buyVol: 0, sellVol: 0, buyPressure: 50 };
    window.paperPosition = { active: false, entrySol: 0, pnlSol: 0 };
    // =========================================================
    // 📡 RICEZIONE TRADE IN DIRETTA E ORDER FLOW (IL RADAR)
    // =========================================================
    if (typeof window.tapePulito === 'undefined') window.tapePulito = false;

    socket.off('nuovo_trade_live');
    socket.on('nuovo_trade_live', (trade) => {
        if (typeof resettaTimerNoia === 'function') resettaTimerNoia();
        
        // 🩸 INNESCO HIVE MIND (Se lo hai attivato)
        if (window.HiveMind) window.HiveMind.sniffTransaction(trade);

        const solAmount = parseFloat(trade.sol) || 0;
        
        // 1. ORDER FLOW (Matematica in background)
        if (typeof orderFlowWindow !== 'undefined') {
            orderFlowWindow.push(trade);
            const tenSecondsAgo = Date.now() - 10000;
            orderFlowWindow = orderFlowWindow.filter(t => t.timestamp > tenSecondsAgo);

            let buyVol = 0; let sellVol = 0;
            orderFlowWindow.forEach(t => { 
                if (t.tipo.includes("BUY")) buyVol += parseFloat(t.sol) || 0; 
                else sellVol += parseFloat(t.sol) || 0; 
            });

            const totalVol = buyVol + sellVol;
            let buyPressure = 50;
            if (totalVol > 0) buyPressure = (buyVol / totalVol) * 100;

            if (window.liveMetrics) {
                window.liveMetrics = { history: window.liveMetrics.history, buyVol, sellVol, buyPressure };
            }

            const barGreen = document.getElementById('flow-bar-green');
            const pctText = document.getElementById('flow-percentage');
            if (barGreen && pctText) {
                barGreen.style.width = `${buyPressure}%`;
                pctText.innerText = `${buyPressure.toFixed(1)}% BUY`;
                pctText.style.color = buyPressure >= 50 ? "#00e676" : "#ff4d4d";
                document.getElementById('flow-vol-buy').innerText = `${buyVol.toFixed(1)} SOL`;
                document.getElementById('flow-vol-sell').innerText = `${sellVol.toFixed(1)} SOL`;
            }
        }

        // 2. ALLARME TRACKER WALLET
        if (window.activeTrackedWallets && window.activeTrackedWallets.length > 0) {
            const walletTrovato = window.activeTrackedWallets.find(w => w.address === trade.wallet);
            if (walletTrovato && walletTrovato.notify !== false) {
                const isAcquisto = trade.tipo.includes("BUY");
                const azioneColor = isAcquisto ? "#00e676" : "#ff4d4d";
                const azioneTesto = isAcquisto ? (typeof t === 'function' ? t('tracker_action_buy') : 'BOUGHT') : (typeof t === 'function' ? t('tracker_action_sell') : 'SOLD'); 
                
                let notificaTracker = document.createElement('div');
                notificaTracker.style.cssText = `
                    position: fixed; bottom: 20px; left: 20px;
                    width: 280px; background: #0a0c10; border-left: 4px solid ${azioneColor};
                    box-shadow: 0 4px 15px rgba(0,0,0,0.8); padding: 12px; border-radius: 6px;
                    z-index: 9999999; color: white; font-family: monospace;
                    animation: slideInLeft 0.5s ease-out;
                `;
                notificaTracker.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <strong style="color:${azioneColor};"> TRACKER: ${walletTrovato.name}</strong>
                        <span class="btn-chiudi-tracker" style="cursor:pointer; color:#888; font-size:1.2em; font-weight:bold;">✕</span>
                    </div>
                    <div style="font-size:0.9em; margin-bottom: 4px;"><b>${azioneTesto}</b></div>
                    <div style="color:#00ffcc; font-weight:bold;">Importo: ${solAmount.toFixed(2)} SOL</div>
                `;
                document.body.appendChild(notificaTracker);
                notificaTracker.querySelector('.btn-chiudi-tracker').addEventListener('click', () => notificaTracker.remove());
                setTimeout(() => { if (document.body.contains(notificaTracker)) notificaTracker.remove(); }, 7000);
            }
        }

        // 3. LIVE TAPE VISIVO
        const tapeList = document.getElementById('live-tape-list');
        if (tapeList) {
            if (!window.tapePulito) { 
                tapeList.innerHTML = ''; 
                window.tapePulito = true; 
            }

            // 🔥 FILTRO ABBASSATO A 0.005 SOL
            if (solAmount > 0.005) {
                let cleanTipo = trade.tipo.replace(/🟢|🔴|📦/g, '').trim(); 
                let isBuy = cleanTipo.includes("BUY");
                let color = isBuy ? "#00e676" : "#ff4d4d";

                let svgIcon = ""; let tagColor = "#888"; let tooltipText = "Retail Flow";
                
                if (trade.zooIcon && (trade.zooIcon.includes("📦") || trade.tipo.includes("BUNDLE"))) { 
                    tagColor = "#c084fc"; tooltipText = "Jito Bundle / Multi-Tx";
                    svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${tagColor}" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
                } else if (trade.zooIcon && trade.zooIcon.includes("🐋")) { 
                    tagColor = "#00ffcc"; tooltipText = "Whale Size";
                    svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${tagColor}" stroke-width="2"><path d="M6 3h12l4 7-10 11L2 10z"/></svg>`;
                } else if (trade.zooIcon && trade.zooIcon.includes("🐬")) { 
                    tagColor = "#ffaa00"; tooltipText = "Smart Money / Dolphin";
                    svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${tagColor}" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
                } else if (trade.zooIcon && trade.zooIcon.includes("🤖")) { 
                    tagColor = "#ff4d4d"; tooltipText = "MEV Bot / Algo";
                    svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${tagColor}" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>`;
                } else {
                    svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${tagColor}" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
                }

                const el = document.createElement('div');
                el.style.cssText = `font-family: monospace; font-size: 0.8em; display: flex; justify-content: space-between; align-items:center; background: #161821; padding: 6px 8px; border-radius: 4px; margin-bottom: 3px; border-left: 3px solid ${color}; box-shadow: 0 2px 4px rgba(0,0,0,0.2);`;
                
                el.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                        <div title="${tooltipText}" style="width: 32px; height: 32px; display: flex; justify-content: center; align-items: center; background: ${tagColor}15; border: 1px solid ${tagColor}40; border-radius: 6px; box-shadow: inset 0 0 8px ${tagColor}20;">
                            ${svgIcon}
                        </div>
                        <div style="display: flex; flex-direction: column; flex-grow: 1;">
                            <strong style="color: ${color}; line-height: 1.1; font-size: 0.85em; text-transform: uppercase; letter-spacing: 1px;">${cleanTipo}</strong>
                            <span style="color: #fff; font-weight: bold; font-size: 1.1em; line-height: 1.2;">${solAmount.toFixed(2)} <span style="font-size:0.65em; color:#888;">SOL</span></span>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: center;">
                            <span style="color:#aaa; font-weight:bold; font-size: 0.8em; font-family: 'Courier New', Courier, monospace;">${trade.wallet.substring(0,4)}..${trade.wallet.slice(-4)}</span>
                            <a href="${trade.solscan || '#'}" target="_blank" style="color: #4da6ff; text-decoration: none; font-size: 0.7em; margin-top:3px; background: rgba(77,166,255,0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(77,166,255,0.3); transition: 0.2s;">TX ↗</a>
                        </div>
                    </div>
                `;
                
                tapeList.prepend(el);
                while (tapeList.children.length > 20) { tapeList.removeChild(tapeList.lastChild); }
            }
        }
    });
    // =========================================================
    // 🌍 MOTORE MULTILINGUA (i18n Engine)
    // =========================================================
    let currentLang = 'en'; 

    const TRANSLATIONS = {
        en: {
            app_name: "MEME SAVER", app_sub: "Radar & Auto-Sniper", settings_btn: "SETTINGS", control_room: "Control Room",
            algo_settings: "Algorithmic Settings", lang_title: "INTERFACE LANGUAGE", pro_title: "Meme Saver PRO",
            status_label: "Status:", status_disconnected: "Disconnected", cloud_wallet_label: "Cloud Wallet:",
            pro_desc: "Connect your extension to our official Cloud Burner Wallet to unlock Auto-Sniper.",
            btn_connect_web: "🔗 Connect Web Account", helius_title: "⚡ Helius API (Fast Node)",
            helius_desc: "Use your dedicated RPC node to prevent throttling.", helius_placeholder: "Paste Helius RPC URL...",
            jito_title: "🛡️ Jito MEV Shield", jito_tip: "Jito Tip (SOL)", slippage: "Max Slippage (%)",
            risk_title: "⚖️ Risk Management", take_profit: "Take Profit (%)", stop_loss: "Stop Loss (%)",
            btn_save: "💾 Save & Activate", btn_saved: "✅ SAVED SUCCESSFULLY!", nav_radar: "Radar",
            nav_tracker: "Tracker", nav_spy: "Spy", btn_reload: "RELOAD", copilot_title: " Copilot AI",
            copilot_btn: "Request Analysis", copilot_analyzing: " Analyzing...", copilot_reanalyze: " Re-analyze",
            orderflow_title: "⏱️ 10s Order Flow", orderflow_waiting: "WAITING...", live_tape_title: " Live Tape",
            live_tape_listening: "Listening to blockchain...", loading_analysis: " Analyzing...",
            loading_base: " Base Data", loading_complete: " Full Report", tracker_title: "💼 SMART MONEY",
            tracker_placeholder: "Address...", tracker_name: "Name (opt)", tracker_btn: "Track", spy_title: "🚨 LIVE SPY FEED",
            spy_waiting: "Waiting for signals...", judge_title: "Judge Verdict", done_in: "Done in",
            dev_history: "Developer History", supply_analysis: "Supply Analysis", high_risk_rug: "⚠️ HIGH RUG RISK.",
            risk_bundle: "⚠️ BUNDLE RISK: Dev might have sniped secretly!", bought: "BOUGHT", sold: "SOLD", investment: "Investment", normal_trade: "NORMAL",
            human_trader: "Human Trader", algo_trader: "Algo Trader", exit_pos: "📉 Exiting position",
            dead_token: " DEAD TOKEN ", dead_desc: "Zero volume for 25s. Change coin!", algo_judgment: "Algorithmic Judgment",
            tactics: "1. Tactics:", prediction: "2. Prediction:", action: "Action:",
            sybil_title: "🚨 SYBIL DUMP", sybil_msg1: "SYBIL BURST:", sybil_msg2: "wallets dumping", sybil_msg3: "SOL in 2s!",
            whale_title: "WHALE MATCH!", whale_buy: "WHALE BUYING", whale_new: "⚠️ Newborn Token",
            whale_inv: "Still invisible on DexScreener. Proceed with caution.", copy_mint: "📋 Copy Mint",
            copied: "✅ Copied!", open_pump: "💊 OPEN PUMP.FUN",
            dev_unknown: "DEV: UNKNOWN", dev_launched: "tokens launched", dev_risk: "risk",
            bundle_top: "Top holders control", bundle_of: "of the bundle", bundle_no_power: "no central power",
            curve_title: "Pump.fun Curve:", curve_completed: "% Completed",
            tracker_action_buy: "has just BOUGHT on this coin!", tracker_action_sell: "has just SOLD on this coin!"
        },
        it: {
            app_name: "MEME SAVER", app_sub: "Radar & Auto-Sniper", settings_btn: "IMPOSTAZIONI", control_room: "Control Room",
            algo_settings: "Impostazioni Algoritmiche", lang_title: "LINGUA INTERFACCIA", pro_title: "Meme Saver PRO",
            status_label: "Stato:", status_disconnected: "Scollegato", cloud_wallet_label: "Cloud Wallet:",
            pro_desc: "Collega l'estensione al tuo Cloud Burner Wallet sulla piattaforma.",
            btn_connect_web: "🔗 Connetti Account Web", helius_title: "⚡ API Helius (Nodo Veloce)",
            helius_desc: "Usa la tua API per operare senza blocchi.", helius_placeholder: "Incolla URL Helius RPC...",
            jito_title: "🛡️ Scudo Jito MEV", jito_tip: "Jito Tip (SOL)", slippage: "Slippage Max (%)",
            risk_title: "⚖️ Gestione Rischio", take_profit: "Take Profit (%)", stop_loss: "Stop Loss (%)",
            btn_save: "💾 Salva e Attiva", btn_saved: "✅ SALVATO CON SUCCESSO!", nav_radar: "Radar",
            nav_tracker: "Tracker", nav_spy: "Spy", btn_reload: "RICARICA", copilot_title: " Copilota AI",
            copilot_btn: "Richiedi Analisi", copilot_analyzing: " Analisi in corso...", copilot_reanalyze: "🔄 Ri-analizza",
            orderflow_title: "⏱️ 10s Order Flow", orderflow_waiting: "IN ATTESA...", live_tape_title: " Live Tape",
            live_tape_listening: "In ascolto della blockchain...", loading_analysis: "⏳ Analisi...",
            loading_base: " Dati Base", loading_complete: " Report Completo", tracker_title: "💼 SMART MONEY",
            tracker_placeholder: "Address...", tracker_name: "Nome (opz)", tracker_btn: "Traccia", spy_title: "🚨 LIVE SPY FEED",
            spy_waiting: "In attesa di movimenti...", judge_title: "Verdetto Giudice", done_in: "Fatto in",
            dev_history: "Developer History", supply_analysis: "Analisi Supply", high_risk_rug: "⚠️ ALTO RISCHIO RUG.",
            risk_bundle: "⚠️ BUNDLE RISK: Dev might have sniped the supply!", bought: "HA COMPRATO", sold: "HA VENDUTO", investment: "Investimento", normal_trade: "NORMALE",
            human_trader: "Trader Umano", algo_trader: "Algo Trader", exit_pos: "📉 Uscita dalla posizione",
            dead_token: "💀 TOKEN MORTO 💀", dead_desc: "Zero volumi da 25s. Cambia moneta!", algo_judgment: "Giudizio Algoritmico",
            tactics: "1. Tattica:", prediction: "2. Previsione:", action: "Azione:",
            sybil_title: "🚨 SYBIL DUMP", sybil_msg1: "RAFFICA SYBIL:", sybil_msg2: "wallet scaricano", sybil_msg3: "SOL in 2s!",
            whale_title: "WHALE MATCH!", whale_buy: "BALENA IN ACQUISTO", whale_new: "⚠️ Token Neonato",
            whale_inv: "Ancora invisibile a DexScreener. Procedi con cautela.", copy_mint: "📋 Copia Mint",
            curve_title: "Pump.fun Curve:", curve_completed: "% Completed",
            tracker_action_buy: "ha appena COMPRATO su questa moneta!",
            tracker_action_sell: "ha appena VENDUTO su questa moneta!",
            copied: "✅ Copiato!", open_pump: "💊 APRI PUMP.FUN",
            dev_unknown: "DEV: SCONOSCIUTO", dev_launched: "token lanciati", dev_risk: "rischio",
            bundle_top: "Top holders controllano", bundle_of: "della bundle", bundle_no_power: "nessun potere centrale",
            dev_young: "DEV: Young", dev_no_trace: "no trace", dev_high_risk: "high risk",
            bundle_positive: "POSITIVE: bundle supply 0%", bundle_no_control: "no control"
        },
        zh: {
            app_name: "MEME SAVER", app_sub: "雷达与自动狙击", settings_btn: "设置", control_room: "控制室",
            algo_settings: "算法设置", lang_title: "界面语言", pro_title: "Meme Saver 专业版",
            status_label: "状态:", status_disconnected: "未连接", cloud_wallet_label: "云端钱包:",
            pro_desc: "连接官方云端钱包以解锁自动狙击功能。", btn_connect_web: "🔗 连接网页账户",
            helius_title: "⚡ Helius 节点 (快速)", helius_desc: "使用专用节点以防止受限。",
            helius_placeholder: "输入 Helius RPC...", jito_title: "🛡️ Jito MEV 防护",
            jito_tip: "Jito 小费 (SOL)", slippage: "最大滑点 (%)", risk_title: "⚖️ 风险管理",
            take_profit: "止盈目标 (%)", stop_loss: "止损限制 (%)", btn_save: "💾 保存并激活",
            btn_saved: "✅ 保存成功！", nav_radar: "雷达", nav_tracker: "追踪", nav_spy: "预警",
            btn_reload: "刷新", copilot_title: " AI 助手", copilot_btn: "请求分析",
            copilot_analyzing: " 分析中...", copilot_reanalyze: " 重新分析", orderflow_title: "⏱️ 10秒订单流",
            orderflow_waiting: "等待中...", live_tape_title: " 实时流水", live_tape_listening: "正在监听区块链...",
            loading_analysis: "⏳ 分析中...", loading_base: " 基础数据", loading_complete: " 完整报告",
            tracker_title: "💼 聪明钱追踪", tracker_placeholder: "钱包地址...", tracker_name: "名称(可选)", tracker_btn: "追踪",
            spy_title: "🚨 实时预警", spy_waiting: "等待链上信号...", judge_title: "法官裁决",
            done_in: "耗时", dev_history: "开发者历史", supply_analysis: "供应量分析",
            high_risk_rug: "⚠️ 高跑路风险.", risk_bundle: "⚠️ 老鼠仓风险!", bought: "买入", sold: "卖出", investment: "投资", normal_trade: "正常",
            human_trader: "人类交易员", algo_trader: "量化机器人", exit_pos: "📉 正在平仓",
            dead_token: "💀 死币 💀", dead_desc: "25秒内零交易量。请换币！", algo_judgment: "算法评判",
            tactics: "1. 策略:", prediction: "2. 预测:", action: "操作:",
            sybil_title: "🚨 女巫砸盘", sybil_msg1: "女巫爆发:", sybil_msg2: "个钱包正在抛售", sybil_msg3: "SOL (2秒内)!",
            whale_title: "巨鲸匹配!", whale_buy: "巨鲸买入", whale_new: "⚠️ 新生代币",
            whale_inv: "DexScreener尚未收录，请谨慎操作。", copy_mint: "📋 复制合约",
            curve_title: "Pump.fun 进度:", curve_completed: "% 已完成",
            tracker_action_buy: "刚刚在此代币上 买入!",
            tracker_action_sell: "刚刚在此代币上 卖出!",
            copied: "✅ 已复制!", open_pump: "💊 打开 PUMP.FUN",
            dev_unknown: "开发者: 未知", dev_launched: "个代币已发布", dev_risk: "风险",
            bundle_top: "前排持有者控制", bundle_of: "的筹码", bundle_no_power: "无中心化控制"
        },
        fr: {
            app_name: "MEME SAVER", app_sub: "Radar & Auto-Sniper", settings_btn: "PARAMÈTRES", control_room: "Contrôle",
            algo_settings: "Paramètres Algorithmiques", lang_title: "LANGUE", pro_title: "Meme Saver PRO",
            status_label: "Statut :", status_disconnected: "Déconnecté", cloud_wallet_label: "Cloud Wallet :",
            pro_desc: "Connectez votre extension au Cloud Wallet.", btn_connect_web: "🔗 Connecter le Compte", 
            helius_title: "⚡ API Helius (Rapide)", helius_desc: "Utilisez votre nœud pour éviter les limites.", helius_placeholder: "Coller l'URL RPC...",
            jito_title: "🛡️ Bouclier Jito MEV", jito_tip: "Pourboire (SOL)", slippage: "Slippage Max (%)",
            risk_title: "⚖️ Gestion du Risque", take_profit: "Take Profit (%)", stop_loss: "Stop Loss (%)",
            btn_save: "💾 Enregistrer", btn_saved: "✅ ENREGISTRÉ !", nav_radar: "Radar",
            nav_tracker: "Tracker", nav_spy: "Spy", btn_reload: "RECHARGER", copilot_title: " Copilote IA",
            copilot_btn: "Demander Analyse", copilot_analyzing: " Analyse...", copilot_reanalyze: "🔄 Ré-analyser",
            orderflow_title: "⏱️ Flux 10s", orderflow_waiting: "ATTENTE...", live_tape_title: " Live Tape",
            live_tape_listening: "Écoute de la blockchain...", loading_analysis: "⏳ Analyse...",
            loading_base: " Données de Base", loading_complete: " Rapport Complet", tracker_title: "💼 SMART MONEY",
            tracker_placeholder: "Adresse...", tracker_name: "Nom (opt)", tracker_btn: "Traquer", spy_title: "🚨 LIVE SPY FEED",
            spy_waiting: "En attente de signaux...", judge_title: "Verdict du Juge", done_in: "Fait en",
            dev_history: "Historique Dév", supply_analysis: "Analyse Offre", high_risk_rug: "⚠️ RISQUE DE RUG.",
            risk_bundle: "⚠️ RISQUE BUNDLE!", bought: "A ACHETÉ", sold: "A VENDU", investment: "Investissement", normal_trade: "NORMAL",
            human_trader: "Trader Humain", algo_trader: "Algo Trader", exit_pos: "📉 Sortie de position",
            dead_token: "💀 JETON MORT 💀", dead_desc: "Zéro volume. Changez de pièce !", algo_judgment: "Jugement Algorithmique",
            tactics: "1. Tactique :", prediction: "2. Prévision :", action: "Action :",
            sybil_title: "🚨 SYBIL DUMP", sybil_msg1: "RAFALE SYBIL :", sybil_msg2: "portefeuilles vendent", sybil_msg3: "SOL en 2s !",
            whale_title: "WHALE MATCH!", whale_buy: "BALEINE EN ACHAT", whale_new: "⚠️ Jeton Nouveau-né",
            whale_inv: "Encore invisible sur DexScreener. Procédez avec prudence.", copy_mint: "📋 Copier Mint",
            curve_title: "Courbe Pump.fun :", curve_completed: "% Terminée",
            tracker_action_buy: "vient d'ACHETER sur cette pièce !",
            tracker_action_sell: "vient de VENDRE sur cette pièce !",
            copied: "✅ Copié !", open_pump: "💊 OUVRIR PUMP.FUN",
            dev_unknown: "DEV : INCONNU", dev_launched: "jetons lancés", dev_risk: "risque",
            bundle_top: "Top holders contrôlent", bundle_of: "du bundle", bundle_no_power: "aucun pouvoir central"
        }
    };

    function t(key) { return TRANSLATIONS[currentLang][key] || TRANSLATIONS['en'][key] || key; }

    function traduciDalBackend(testo) {
        if (!testo) return "";
        return testo
            .replace(/HA COMPRATO:/gi, "BOUGHT:")
            .replace(/HA VENDUTO:/gi, "SOLD:")
            .replace(/HA COMPRATO/gi, "BOUGHT")
            .replace(/HA VENDUTO/gi, "SOLD")
            .replace(/TEST \/ RISCHIO/gi, "TEST / RISK")
            .replace(/ALTA CONVINZIONE/gi, "HIGH CONVICTION")
            .replace(/Investimento:/gi, "Investment:")
            .replace(/NORMALE/gi, "NORMAL")
            .replace(/Trader Umano/gi, "Human Trader")
            .replace(/Algo Trader/gi, "Algo Trader")
            .replace(/Uscita dalla posizione/gi, "Exiting position")
            .replace(/TOKEN MORTO/gi, "DEAD TOKEN")
            .replace(/Zero volumi da 25s.*/gi, "Zero volume. Change coin!")
            .replace(/Giudizio Algoritmico/gi, "Algorithmic Judgment")
            .replace(/RAFFICA SYBIL:/gi, "SYBIL BURST:")
            .replace(/wallet stanno scaricando un totale di/gi, "wallets dumping a total of")
            .replace(/wallet scaricano/gi, "wallets dumping")
            .replace(/SOL in 2s!/gi, "SOL in 2s!")
            .replace(/DEV: SCONOSCIUTO/gi, "DEV: UNKNOWN")
            .replace(/Sconosciuto/gi, "Unknown")
            .replace(/Ignota/gi, "Unknown")
            .replace(/Sospetto - /gi, "Suspicious - ")
            .replace(/Dev molto giovane/gi, "Very young dev")
            .replace(/DEV: Giovane/gi, "DEV: Young")
            .replace(/Wallet giovane/gi, "Young wallet")
            .replace(/e Fake Dev/gi, "and Fake Dev")
            .replace(/ma non fake/gi, "but not fake")
            .replace(/senza traccia/gi, "no history")
            .replace(/rischio alto/gi, "high risk")
            .replace(/alto rischio/gi, "high risk")
            .replace(/token lanciati/gi, "tokens launched")
            .replace(/PULITO \(Wallet Nuovo\)/gi, "CLEAN (Fresh Wallet)")
            .replace(/PULITO \(Primo Progetto\)/gi, "CLEAN (First Project)")
            .replace(/DEV RICORRENTE/gi, "RETURNING DEV")
            .replace(/FAKE DEV: Wallet creato da meno di 24 ore!/gi, "FAKE DEV: Wallet created less than 24h ago!")
            .replace(/POSITIVO:/gi, "CLEAN:")
            .replace(/Top holders non controllano supply/gi, "Top holders do not control supply")
            .replace(/Top holders controllano/gi, "Top holders control")
            .replace(/controllata dai top holder/gi, "controlled by top holders")
            .replace(/dei top holders/gi, "from top holders")
            .replace(/della bundle/gi, "of the bundle")
            .replace(/nessun potere centrale/gi, "no central power")
            .replace(/nessun controllo/gi, "no central power")
            .replace(/Nessun bundle rilevato/gi, "No bundle detected")
            .replace(/Nessun dato Sybil/gi, "No Sybil data")
            .replace(/Nessun dato Micro-Dump/gi, "No Micro-Dump data")
            .replace(/Dati di mercato assenti/gi, "Market data unavailable")
            .replace(/- Sicuro/gi, "- Safe")
            .replace(/Sicuro/gi, "Safe")
            .replace(/Rischio BUNDLE: il dev potrebbe aver cecchinato!/gi, "BUNDLE Risk: Dev might have sniped the supply!");
    }

    let timerNoiaExtension;
    function resettaTimerNoia() {
        // 🔥 FUNZIONE DISABILITATA: Nessun allarme "Dead Token" se mancano i volumi.
        // Manteniamo solo il clearTimeout per pulizia della RAM, ma non inneschiamo nessun allarme.
        if (timerNoiaExtension) clearTimeout(timerNoiaExtension);
    }

    function avviaRadar() {
        chrome.storage.local.get(['userLanguage'], (res) => {
            currentLang = res.userLanguage ? res.userLanguage : 'en'; 

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || tabs.length === 0) return;
                const url = tabs[0].url;
                
                const matchEVM = url.match(/0x[a-fA-F0-9]{40}/);
                const matchSolana = url.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);

                let tokenMint = null;
                if (matchEVM) {
                    tokenMint = matchEVM[0]; 
                } else if (matchSolana) {
                    tokenMint = matchSolana[0]; 
                }
                // 🔥 FIX 1: AZZERAMENTO MEMORIA E RISCALDAMENTO
                // Se abbiamo cambiato pagina o token, puliamo i dati del token precedente
                if (window.currentTokenMint !== tokenMint) {
                    window.currentTokenMint = tokenMint;
                    
                    // Puliamo l'array dei trade precedenti
                    if (typeof orderFlowWindow !== 'undefined') orderFlowWindow.length = 0;
                    
                    // Resettiamo le metriche live
                    window.liveMetrics = { history: [], buyVol: 0, sellVol: 0, buyPressure: 50 };
                    
                    // Rimandiamo il Matrix Watcher in fase di riscaldamento
                    window.matrixWarmupTicks = 0; 
                }
                // 🔥 FIX GOOGLE REVIEW: Costruiamo SEMPRE l'interfaccia del Popup, 
                // anche se non c'è un token, così il revisore vede che l'app funziona.
                costruisciInterfacciaLive(tokenMint);
                resettaTimerNoia();

                // Se non c'è un token, ci fermiamo qui senza chiamare le API del backend
                if (!tokenMint || tokenMint === 'board' || tokenMint === 'create') {
                    return;
                }

                // Altrimenti, facciamo partire l'analisi API normale
                chrome.storage.local.get(['ultimoTokenScansionato', 'ultimoRisultatoScan', 'ultimoScanLang', 'userConnectedWallet'], (memoria) => {
                    const userWallet = memoria.userConnectedWallet || "null";

                    if (memoria.ultimoTokenScansionato === tokenMint && memoria.ultimoRisultatoScan && memoria.ultimoScanLang === currentLang) {
                        popolaInterfacciaStatica(memoria.ultimoRisultatoScan, tokenMint);
                        avviaLaboratorioGemini(tokenMint); 
                        
                        fetch(`https://help-trading-production.up.railway.app/api/scan/${tokenMint}?lang=${currentLang}`, {
                            headers: { "x-wallet-address": userWallet }
                        }).catch(() => {});
                    } else {
                        fetch(`https://help-trading-production.up.railway.app/api/scan/${tokenMint}?lang=${currentLang}`, {
                            headers: { "x-wallet-address": userWallet }
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.error) throw new Error(data.error);
                            chrome.storage.local.set({ 
                                ultimoTokenScansionato: tokenMint, 
                                ultimoRisultatoScan: data,
                                ultimoScanLang: currentLang 
                            });
                            popolaInterfacciaStatica(data, tokenMint);
                            avviaLaboratorioGemini(tokenMint);
                        })
                        .catch(err => {
                            const staticBox = document.getElementById('static-analysis-box');
                            if (staticBox) staticBox.innerHTML = `<div style="color:#ff4d4d; padding:15px; border:1px solid #ff4d4d; background: rgba(255, 77, 77, 0.1); border-radius:8px; text-align:center;">Error: ${err.message}</div>`;
                        });
                    }
                });
            });
        });
    }

    function costruisciInterfacciaLive(tokenMint) {
        const av1 = chrome.runtime.getURL("avatar1.png");
        const av2 = chrome.runtime.getURL("avatar2.png");
        const av3 = chrome.runtime.getURL("avatar3.png");
        const av4 = chrome.runtime.getURL("avatar4.png");

        const copilotHTML = `
            <div style="background: #0f1118; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #2d3142; position: relative; overflow: hidden;">
                <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: #b366ff; opacity: 0.15; filter: blur(20px); border-radius: 50%;"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.2em;">🧠</span>
                        <span style="font-size: 0.8em; color: #e4e4e7; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">${t('copilot_title')}</span>
                    </div>
                    <button id="btn-copilot" style="background: linear-gradient(90deg, #9333ea, #b366ff); color: #fff; border: none; padding: 6px 14px; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.5px; transition: transform 0.1s; box-shadow: 0 2px 10px rgba(179, 102, 255, 0.3);">
                        ${t('copilot_btn')}
                    </button>
                </div>
                <div id="copilot-result" style="font-family: monospace; font-size: 0.85em; color: #ccc; display: none; margin-top: 12px; position: relative; z-index: 2;"></div>
            </div>`;

        const orderFlowHTML = `
            <div style="background: #0f1118; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #2d3142;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 0.75em; color: #888; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">${t('orderflow_title')}</span>
                    <span id="flow-percentage" style="color: #00ffcc; font-weight: 900; font-family: monospace; background: rgba(0, 255, 204, 0.1); padding: 2px 6px; border-radius: 4px;">${t('orderflow_waiting')}</span>
                </div>
                
                <div style="width: 100%; height: 8px; background: #2a1111; border-radius: 4px; overflow: hidden; display: flex;">
                    <div id="flow-bar-green" style="width: 50%; height: 100%; background: linear-gradient(90deg, #00b38f, #00e676); transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    <div style="flex-grow: 1; height: 100%; background: linear-gradient(90deg, #ff4d4d, #cc0000);"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-top: 8px; font-family: monospace; font-size: 0.75em; font-weight: bold;">
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span style="color:#00e676;">IN:</span>
                        <span id="flow-vol-buy" style="color: #fff;">0.0 SOL</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span style="color:#ff4d4d;">OUT:</span>
                        <span id="flow-vol-sell" style="color: #fff;">0.0 SOL</span>
                    </div>
                </div>
            </div>`;

        const liveTapeHTML = `
            <div style="background: #0f1118; padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #2d3142;">
                <div style="font-size: 0.75em; color: #888; text-transform: uppercase; margin-bottom: 10px; font-weight: 800; letter-spacing: 1px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display:inline-block; width:8px; height:8px; background:#ff4d4d; border-radius:50%; animation: pulseGlow 1s infinite;"></span>
                        <span>${t('live_tape_title')}</span>
                    </div>
                    <span style="color: #00ffcc; font-size: 0.8em; font-family: monospace; background:rgba(0,255,204,0.1); padding:2px 6px; border-radius:4px;">WSS Sync</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; font-size: 0.65em; color: #666; text-transform: uppercase; font-weight: bold; padding-bottom: 4px; border-bottom: 1px solid #2d3142; margin-bottom: 8px; padding-left: 8px; padding-right: 8px;">
                    <span>Action / Size</span>
                    <span>Wallet</span>
                </div>
                
                <div id="live-tape-list" style="display: flex; flex-direction: column; gap: 4px; height: 160px; overflow-y: auto; padding-right: 4px; scroll-behavior: smooth;">
                    <div style="text-align:center; color:#555; font-style:italic; font-size:0.8em; margin-top:30px;">${t('live_tape_listening')}</div>
                </div>
            </div>`;

        contentDiv.innerHTML = `
            <style>
                #scroll-area, #live-tape-list, #spy-feed-list { overflow-anchor: none !important; }
                @keyframes slideInLeft { 0% { transform: translateX(-100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
                @keyframes pulseGlow { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                @keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); } }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: transparent; } 
                ::-webkit-scrollbar-thumb { background: #2d3142; border-radius: 3px; }
                .avatar-option { width: 36px; height: 36px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; opacity: 0.5; transition: 0.2s; object-fit: cover; }
                .avatar-option.active { border: 2px solid #00ffcc; opacity: 1; transform: scale(1.1); box-shadow: 0 0 10px rgba(0,255,204,0.4); }
                .lang-btn { flex: 1; border: 1px solid #444; border-radius: 4px; padding: 5px 2px; font-size: 0.85em; font-weight: bold; cursor: pointer; transition: 0.2s; font-family: monospace; }
                .select-modern { width: 100%; background: #0a0c10; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.75em; outline: none; cursor: pointer; }
                .select-modern option { background: #050608; color: #ffffff; font-family: Tahoma, sans-serif; font-weight: bold; }
            </style>
            
            <div style="width: 100%; display: flex; flex-direction: column; box-sizing: border-box;">
                <div id="hud-header" style="background: rgba(18, 21, 31, 0.95); backdrop-filter: blur(5px); border-bottom: 2px solid #444; padding: 12px; display: flex; flex-direction: column; flex-shrink: 0; z-index: 10;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div>
                            <div style="font-size: 0.6em; color: #888; text-transform: uppercase; letter-spacing: 1px;">Meme Saver</div>
                            <div style="font-size: 0.95em; font-weight: 900; color: #00ffcc; font-family: monospace;">Trading Terminal</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.65em; color: #aaa; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Settings</span>
                            <div id="btn-user-profile" title="Settings" style="background: #1a1c29; border: 1px solid #2d3142; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; box-shadow: 0 0 15px rgba(0,255,204,0.2); overflow: hidden;">
                                <img id="current-user-avatar" src="${av1}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        </div>
                    </div>
                </div>

                <div id="scroll-area" style="flex-grow: 1; overflow-y: auto; padding: 15px; padding-bottom: 25px;">
                    
                    <!-- USER DASHBOARD -->
                    <div id="view-user" style="display: none; height: 100%;">
                        
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px;">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b366ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: pulseGlow 3s infinite;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            <div>
                                <h3 style="margin: 0; color: #fff; font-weight: 900; letter-spacing: 1px; font-family: monospace;">Control Room</h3>
                                <div style="color: #888; font-size: 0.65em; margin-top: 2px; text-transform: uppercase;">Algorithm Settings</div>
                            </div>
                        </div>

                        <!-- LANGUAGE SELECTOR -->
                        <div style="background: #161821; border: 1px solid #2d3142; border-radius: 8px; padding: 8px 12px; margin-bottom: 15px;">
                            <div style="font-size: 0.65em; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 6px; text-align: center;">Interface Language</div>
                            <div style="display: flex; justify-content: space-between; gap: 6px;">
                                <button class="lang-btn" data-lang="en" style="background: ${currentLang === 'en' ? '#00ffcc' : '#0a0c10'}; color: ${currentLang === 'en' ? '#000' : '#fff'};">EN</button>
                                <button class="lang-btn" data-lang="it" style="background: ${currentLang === 'it' ? '#00ffcc' : '#0a0c10'}; color: ${currentLang === 'it' ? '#000' : '#fff'};">IT</button>
                                <button class="lang-btn" data-lang="zh" style="background: ${currentLang === 'zh' ? '#00ffcc' : '#0a0c10'}; color: ${currentLang === 'zh' ? '#000' : '#fff'};">ZH</button>
                                <button class="lang-btn" data-lang="fr" style="background: ${currentLang === 'fr' ? '#00ffcc' : '#0a0c10'}; color: ${currentLang === 'fr' ? '#000' : '#fff'};">FR</button>
                            </div>
                        </div>

                        <!-- PRO PORTAL (LICENSE & AUTHENTICATION) -->
                        <div style="background: linear-gradient(145deg, #0a0c10, #161821); border: 1px solid #2d3142; border-left: 3px solid #00ffcc; border-radius: 8px; padding: 15px; margin-bottom: 15px; text-align: left; box-shadow: 0 4px 15px rgba(0, 255, 204, 0.05);">
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <strong style="color: #00ffcc; font-size: 0.85em; text-transform: uppercase; letter-spacing: 1px; font-family: monospace;">License & Auth</strong>
                                <span id="account-status-badge" style="background: rgba(170, 170, 170, 0.1); color: #aaa; border: 1px solid #444; padding: 3px 8px; border-radius: 4px; font-size: 0.65em; font-weight: bold; font-family: monospace; letter-spacing: 1px; text-transform: uppercase;">UNVERIFIED</span>
                            </div>
                            
                            <div style="color: #888; font-size: 0.75em; line-height: 1.4; margin-bottom: 12px; font-family: 'Segoe UI', Tahoma, sans-serif;">
                                Enter your <span style="color:#e4e4e7; font-weight:bold;">Sync Key</span> to unlock real-time WebSockets, EVM forensics, and unlimited AI Scans.
                            </div>
                            
                            <div style="position: relative; margin-bottom: 12px;">
                                <input type="password" id="user-sync-key" placeholder="Paste key here (e.g. ms-pro-...)" style="width: 100%; box-sizing: border-box; background: #050608; border: 1px solid #444; color: #00ffcc; padding: 10px 35px 10px 10px; border-radius: 4px; font-family: monospace; font-size: 0.75em; outline: none; transition: 0.2s;">
                                
                                <div id="toggle-key-visibility" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #666; display: flex; align-items: center; justify-content: center; transition: 0.2s;" title="Show/Hide">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 8px;">
                                <button id="btn-save-sync" style="flex: 1.5; background: #1a1c29; color: #00ffcc; border: 1px solid #00ffcc; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75em; text-transform: uppercase; transition: 0.2s; font-family: monospace;">Authenticate</button>
                                <button id="btn-logout-sync" style="display: none; flex: 1.5; background: #1a1c29; color: #ff4d4d; border: 1px solid #ff4d4d; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75em; text-transform: uppercase; transition: 0.2s; font-family: monospace;">Disconnect</button>
                                <a href="https://www.memesaver.lol/dashboard/wallet" target="_blank" style="flex: 1; background: #00ffcc; color: #000; border: none; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75em; text-transform: uppercase; text-decoration: none; display: flex; align-items: center; justify-content: center; font-family: monospace;">Upgrade</a>
                            </div>
                        </div>

                        <!-- AI SELECTOR -->
                        <div style="background: #11121a; border: 1px solid #2d3142; border-left: 3px solid #a855f7; border-radius: 8px; padding: 12px; margin-bottom: 15px; position: relative;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <strong style="color: #a855f7; font-size: 0.8em; text-transform: uppercase; font-weight: 900; font-family: monospace;">AI Engine</strong>
                                <span id="ai-premium-badge" style="font-size: 0.65em; background: rgba(168, 85, 247, 0.1); padding: 3px 6px; border-radius: 4px; color: #c084fc; font-weight: bold; border: 1px solid #a855f7; font-family: monospace;">LOCKED</span>
                            </div>
                            <select id="user-ai-model" disabled class="select-modern" style="cursor: not-allowed; transition: all 0.3s;">
                                <option value="deepseek/deepseek-chat">DeepSeek V3 (Fast - Default)</option>
                                <option value="openai/gpt-4o">GPT-4o (Institutional)</option>
                                <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Analytical)</option>
                            </select>
                            <p id="ai-upgrade-text" style="color: #666; font-size: 0.65em; margin-top: 8px; margin-bottom: 0; line-height: 1.3;"><b>PREMIUM</b> plan exclusive. Unlock institutional models.</p>
                        </div>

                        <!-- AVATAR SELECTION & HOLOGRAM TOGGLE -->
                        <div style="background: #11121a; border: 1px solid #2d3142; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed #2d3142; padding-bottom: 8px;">
                                <strong style="color: #00ffcc; font-size: 0.8em; text-transform: uppercase; font-family: monospace;">Tactical Hologram</strong>
                                <label style="position: relative; display: inline-block; width: 40px; height: 20px;">
                                    <input type="checkbox" id="user-holo-toggle" checked style="opacity: 0; width: 0; height: 0;">
                                    <span id="holo-toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #00e676; transition: .4s; border-radius: 20px; box-shadow: inset 0 0 5px rgba(0,0,0,0.5);"></span>
                                    <span id="holo-toggle-knob" style="position: absolute; content: ''; height: 16px; width: 16px; left: 22px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
                                </label>
                            </div>

                            <div style="display: flex; justify-content: center; gap: 12px; padding-bottom: 5px;">
                                <img class="avatar-option" data-src="${av1}" src="${av1}" title="Avatar 1">
                                <img class="avatar-option" data-src="${av2}" src="${av2}" title="Avatar 2">
                                <img class="avatar-option" data-src="${av3}" src="${av3}" title="Avatar 3">
                                <img class="avatar-option" data-src="${av4}" src="${av4}" title="Avatar 4">
                            </div>
                        </div>

                        <!-- TRADING ROUTE & RISK MANAGEMENT -->
                        <div style="margin-bottom: 15px; border: 1px dashed #a855f7; border-radius: 8px; padding: 12px; background: rgba(168, 85, 247, 0.05);">
                            
                            <div style="display: flex; justify-content: center; margin-bottom: 12px;">
                                <span style="background: linear-gradient(90deg, #ff007f, #a855f7); color: #fff; font-size: 0.65em; font-weight: 900; padding: 4px 12px; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 0 10px rgba(255,0,127,0.4); font-family: monospace;">
                                    V2: AUTO-TRADING PENDING
                                </span>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; opacity: 0.4; pointer-events: none; filter: grayscale(30%);">
                                <div style="background: #161821; border: 1px solid #2d3142; border-top: 3px solid #4da6ff; border-radius: 6px; padding: 10px;">
                                    <strong style="color: #4da6ff; font-size: 0.7em; text-transform: uppercase; font-family: monospace;">Route Mode</strong>
                                    <select disabled id="user-route-mode" class="select-modern" style="margin-top: 6px; border: 1px solid #4da6ff; background: rgba(77, 166, 255, 0.05);">
                                        <option value="standard">Standard</option>
                                    </select>
                                </div>
                                <div style="background: #161821; border: 1px solid #2d3142; border-top: 3px solid #ffaa00; border-radius: 6px; padding: 10px;">
                                    <strong style="color: #ffaa00; font-size: 0.7em; text-transform: uppercase; font-family: monospace;">Risk Profile</strong>
                                    <select disabled id="user-risk-profile" class="select-modern" style="margin-top: 6px; border: 1px solid #ffaa00; background: rgba(255, 170, 0, 0.05);">
                                        <option value="safe">Safe</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- SCAN HISTORY -->
                        <div style="background: #0a0c10; border: 1px solid #2d3142; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                            <strong style="color: #aaa; font-size: 0.7em; text-transform: uppercase; display: block; margin-bottom: 8px; font-family: monospace;">Scan History</strong>
                            <div style="font-size: 0.75em; color: #666; font-family: monospace; line-height: 1.5;">
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #222; padding-bottom: 4px; margin-bottom: 4px;"><span>FUKg...9xK</span> <span style="color: #ff4d4d;">AVOID</span></div>
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #222; padding-bottom: 4px; margin-bottom: 4px;"><span>8mvf...Xwv</span> <span style="color: #00e676;">RIDE</span></div>
                                <div style="display: flex; justify-content: space-between;"><span>3Bkx...1oP</span> <span style="color: #ffaa00;">SCALP</span></div>
                            </div>
                        </div>

                        <button id="btn-save-config" style="width: 100%; background: linear-gradient(90deg, #00ffcc, #00b38f); color: #000; border: none; padding: 10px; border-radius: 6px; font-weight: 900; font-size: 0.85em; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s; margin-bottom: 10px; font-family: monospace;">
                            Save Settings
                        </button>

                        <!-- DISCORD UNDERGROUND -->
                        <a id="btn-discord" href="https://discord.gg/J9wsre2Mz" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box; background: #111; border: 1px dashed #5865F2; color: #5865F2; text-decoration: none; padding: 10px; border-radius: 6px; font-weight: bold; font-size: 0.8em; cursor: pointer; transition: 0.2s; font-family: monospace;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
                            <span id="discord-text">Join the Resistance</span>
                        </a>
                    </div>

                    <!-- TAB 1: RADAR -->
                    <div id="view-radar">
                        ${tokenMint ? `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <div style="display: flex; align-items: center; gap: 8px; font-family: monospace; color: #00ffcc; font-size: 0.85em; background: #0a0c10; padding: 6px 10px; border-radius: 6px; border: 1px solid #1a1c29; height: 32px; box-sizing: border-box;">
                                    <span style="display: flex; align-items: center;"> ${tokenMint.substring(0,12)}...</span>
                                    <span style="color:#2d3142;">|</span>
                                    <span id="mint-loading-status" style="color: #ffaa00; font-size: 0.95em; font-weight: bold; display: flex; align-items: center; animation: pulseGlow 1.5s infinite;">Analyzing...</span>
                                </div>
                                <button id="btn-ricarica" style="background: #161821; border: 1px solid #2d3142; color: #00ffcc; font-weight: bold; padding: 0 12px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 0.7em; text-transform: uppercase; box-sizing: border-box; display: flex; align-items: center; font-family: monospace;">Reload</button>
                            </div>
                            ${copilotHTML}
                            ${orderFlowHTML}
                            ${liveTapeHTML}
                            <div id="static-analysis-box"></div>
                        ` : `
                            <div style="text-align:center; padding: 40px 20px; background: #0f1118; border: 1px solid #2d3142; border-radius: 8px;">
                                <span style="font-size: 3em; display: block; margin-bottom: 15px;">🌐</span>
                                <strong style="color: #00ffcc; font-family: monospace; font-size: 1.2em;">AWAITING MARKET DATA</strong>
                                <p style="color: #888; font-size: 0.85em; margin-top: 10px; line-height: 1.4;">Navigate to any token on <b>Pump.fun</b> or <b>DexScreener</b> to activate the Radar.</p>
                            </div>
                        `}
                    </div>

                    <!-- TAB 2: TRACKER -->
                    <div id="view-tracker" style="display: none;">
                        <div style="text-align: center; margin-bottom: 15px;"><h3 style="margin: 0; color: #00ffcc; font-weight: 900; letter-spacing: 1px; font-family: monospace;">Wallet Tracker</h3></div>
                        
                        <div style="display: flex; gap: 6px; margin-bottom: 15px; align-items: stretch;">
                            <input type="text" id="new-wallet-name" placeholder="Alias" style="width: 30%; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid #2d3142; border-radius: 6px; color: white; outline: none; font-size: 0.7em; font-family: monospace;">
                            <input type="text" id="new-wallet-input" placeholder="Paste Wallet..." style="flex-grow: 1; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid #2d3142; border-radius: 6px; color: white; outline: none; font-size: 0.75em; font-family: monospace;">
                            <button id="add-wallet-btn" style="padding: 0 12px; background: #00ffcc; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75em; font-family: monospace;">Add</button>
                        </div>
                        
                        <div id="tracked-wallets-list" style="font-size: 11px;"></div>
                    </div>

                    <!-- TAB 3: SPY FEED -->
                    <div id="view-spy" style="display: none;">
                        <div style="text-align: center; margin-bottom: 15px;"><h3 style="margin: 0; color: #ff007f; font-weight: 900; letter-spacing: 1px; font-family: monospace;">Spy Radar</h3></div>
                        <div id="spy-feed-list" style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="text-align:center; color:#555; font-style:italic; padding: 20px; font-size:0.9em; font-family: monospace;">Waiting for target transactions...</div>
                        </div>
                    </div>
                </div>

                <!-- BOTTOM TABS -->
                <div id="bottom-tabs-nav" style="display: flex; background: rgba(10, 12, 16, 0.95); backdrop-filter: blur(5px); border-top: 1px solid #1a1c29; height: 55px; flex-shrink: 0; z-index: 10;">
                    <div id="tab-radar" class="nav-tab active-tab" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #00ffcc; border-top: 2px solid #00ffcc; background: rgba(0, 255, 204, 0.05); transition: all 0.2s;">
                        <span style="font-size: 0.8em; font-weight: 900; text-transform: uppercase; font-family: monospace;">Radar</span>
                    </div>
                    <div id="tab-tracker" class="nav-tab" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #777; border-top: 2px solid transparent; transition: all 0.2s;">
                        <span style="font-size: 0.8em; font-weight: 900; text-transform: uppercase; font-family: monospace;">Tracker</span>
                    </div>
                    <div id="tab-spy" class="nav-tab" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #777; border-top: 2px solid transparent; transition: all 0.2s;">
                        <span style="font-size: 0.8em; font-weight: 900; text-transform: uppercase; font-family: monospace;">Spy</span>
                    </div>
                </div>
            </div>
        `;

        configuraEventiBase(tokenMint);
        inizializzaTracker();
        loadSavedWallets();
        caricaStoricoSpyNelDOM();
    }

    function showPremiumModal(title, message, isConfirm, onConfirm) {
        const overlay = document.createElement('div');
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(6px); z-index:999999; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.3s ease;";
        
        const modal = document.createElement('div');
        const borderColor = isConfirm ? "#ffaa00" : "#ff4d4d"; 
        const icon = isConfirm ? "⚠️" : "❌";

        modal.style.cssText = `background:linear-gradient(145deg, #161821, #0a0c10); border:1px solid #2d3142; border-top:3px solid ${borderColor}; border-radius:12px; padding:25px; width:340px; text-align:center; box-shadow:0 15px 40px rgba(0,0,0,0.7); transform:scale(0.8); transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); font-family: 'Segoe UI', sans-serif;`;
        
        modal.innerHTML = `
            <div style="font-size:3.5em; margin-bottom:10px; line-height:1;">${icon}</div>
            <h3 style="color:#fff; font-size:1.2em; font-weight:800; text-transform:uppercase; margin:0 0 12px 0;">${title}</h3>
            <p style="color:#aaa; font-size:0.9em; margin-bottom:25px; line-height:1.5;">${message}</p>
            <div style="display:flex; gap:12px; justify-content:center;" id="modal-buttons-container"></div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        const btnContainer = modal.querySelector('#modal-buttons-container');

        const closeModal = () => {
            overlay.style.opacity = "0";
            modal.style.transform = "scale(0.8)";
            setTimeout(() => overlay.remove(), 300);
        };

        if (isConfirm) {
            btnContainer.innerHTML = `
                <button id="modal-cancel" style="background:#222; border:1px solid #444; color:#fff; padding:10px 15px; border-radius:6px; cursor:pointer; flex:1; font-weight:bold; transition:0.2s;">Cancel</button>
                <button id="modal-confirm" style="background:linear-gradient(90deg, #ff4d4d, #cc0000); border:none; color:#fff; padding:10px 15px; border-radius:6px; cursor:pointer; flex:1; font-weight:bold; box-shadow:0 0 15px rgba(255,77,77,0.4); transition:0.2s;">Disconnect</button>
            `;
            modal.querySelector('#modal-cancel').onclick = closeModal;
            modal.querySelector('#modal-confirm').onclick = () => {
                onConfirm();
                closeModal();
            };
        } else {
            btnContainer.innerHTML = `
                <button id="modal-ok" style="background:linear-gradient(90deg, #4da6ff, #0073e6); border:none; color:#fff; padding:10px 25px; border-radius:6px; cursor:pointer; font-weight:bold; box-shadow:0 0 15px rgba(77,166,255,0.4); transition:0.2s;">Understood</button>
            `;
            modal.querySelector('#modal-ok').onclick = closeModal;
        }

        requestAnimationFrame(() => {
            overlay.style.opacity = "1";
            modal.style.transform = "scale(1)";
        });
    }

    function configuraEventiBase(tokenMint) {
        const tabs = ['radar', 'tracker', 'spy'];
        const viewUser = document.getElementById('view-user');
        const bottomNav = document.getElementById('bottom-tabs-nav');
        
        function switchTab(activeId) {
            viewUser.style.display = 'none'; 
            bottomNav.style.display = 'flex'; 
            document.getElementById('btn-user-profile').style.background = '#1a1c29'; 

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

        const btnUser = document.getElementById('btn-user-profile');
        if (btnUser) {
            btnUser.addEventListener('click', () => {
                const isUserOpen = viewUser.style.display === 'block';
                if (isUserOpen) {
                    switchTab('radar'); 
                } else {
                    tabs.forEach(id => document.getElementById(`view-${id}`).style.display = 'none');
                    viewUser.style.display = 'block';
                    bottomNav.style.display = 'none'; 
                    btnUser.style.background = '#00ffcc';
                }
            });
        }

        const av1 = chrome.runtime.getURL("avatar1.png");
        let selectedAvatarUrl = av1; 

        const avatarOptions = document.querySelectorAll('.avatar-option');
        avatarOptions.forEach(img => {
            img.addEventListener('click', (e) => {
                avatarOptions.forEach(opt => opt.classList.remove('active')); 
                e.target.classList.add('active'); 
                selectedAvatarUrl = e.target.getAttribute('data-src');
                document.getElementById('current-user-avatar').src = selectedAvatarUrl; 
                
                chrome.storage.local.get(['userConfig'], (configRes) => {
                    const newC = configRes.userConfig || {};
                    newC.avatarUrl = selectedAvatarUrl;
                    chrome.storage.local.set({ userConfig: newC });
                });
            });
        });

        chrome.storage.local.get(['userConfig', 'userAuthToken'], (res) => {
            if (res.userConfig) {
                if (document.getElementById('user-route-mode')) document.getElementById('user-route-mode').value = res.userConfig.routeMode || "standard";
                if (document.getElementById('user-risk-profile')) document.getElementById('user-risk-profile').value = res.userConfig.riskProfile || "safe";
                
                // Carica stato Ologramma (Senza doppioni)
                const holoToggle = document.getElementById('user-holo-toggle');
                const holoSlider = document.getElementById('holo-toggle-slider');
                const holoKnob = document.getElementById('holo-toggle-knob');
                
                let isHoloEnabled = res.userConfig.holoEnabled !== false; // Default true
                
                if (holoToggle) {
                    holoToggle.checked = isHoloEnabled;
                    if (!isHoloEnabled) {
                        holoSlider.style.backgroundColor = '#444';
                        holoKnob.style.left = '2px';
                    }
                    
                    holoToggle.addEventListener('change', (e) => {
                        const isChecked = e.target.checked;
                        if (isChecked) {
                            holoSlider.style.backgroundColor = '#00e676';
                            holoKnob.style.left = '22px';
                        } else {
                            holoSlider.style.backgroundColor = '#444';
                            holoKnob.style.left = '2px';
                        }
                        
                        // 🔥 SALVATAGGIO ISTANTANEO! Non serve più premere "Save Settings"
                        chrome.storage.local.get(['userConfig'], (configRes) => {
                            const newC = configRes.userConfig || {};
                            newC.holoEnabled = isChecked;
                            chrome.storage.local.set({ userConfig: newC });
                        });
                    });
                }

                if (res.userConfig.avatarUrl) {
                    selectedAvatarUrl = res.userConfig.avatarUrl;
                    document.getElementById('current-user-avatar').src = selectedAvatarUrl;
                    avatarOptions.forEach(opt => {
                        opt.classList.remove('active');
                        if (opt.getAttribute('data-src') === selectedAvatarUrl) opt.classList.add('active');
                    });
                }
            } else {
                avatarOptions[0].classList.add('active');
            }

            const aiSelect = document.getElementById('user-ai-model');
            const aiBadge = document.getElementById('ai-premium-badge');
            const aiText = document.getElementById('ai-upgrade-text');
            const token = res.userAuthToken || "";

            const isPremium = token.includes('ms-premium-') || token.includes('admin');

            if (aiSelect) {
                if (isPremium) {
                    aiSelect.disabled = false;
                    aiSelect.style.color = "#00ffcc";
                    aiSelect.style.border = "1px solid #a855f7";
                    aiSelect.style.cursor = "pointer";
                    aiSelect.style.background = "#0a0c10";
                    
                    aiBadge.innerText = "💎 PREMIUM";
                    aiBadge.style.background = "rgba(168, 85, 247, 0.2)";
                    aiBadge.style.color = "#a855f7";
                    aiBadge.style.border = "1px solid #a855f7";
                    
                    aiText.style.display = "none"; 
                }

                aiSelect.value = res.userConfig?.aiModel || "deepseek/deepseek-chat";

                aiSelect.addEventListener('change', () => {
                    chrome.storage.local.get(['userConfig'], (configRes) => {
                        const newC = configRes.userConfig || {};
                        newC.aiModel = aiSelect.value;
                        
                        chrome.storage.local.set({ userConfig: newC }, () => {
                            if (aiBadge) { 
                                aiBadge.innerText = "✓ SAVED";
                                aiBadge.style.background = "rgba(0, 230, 118, 0.2)";
                                aiBadge.style.color = "#00e676";
                                aiBadge.style.border = "1px solid #00e676";
                                
                                setTimeout(() => { 
                                    aiBadge.innerText = "💎 PREMIUM"; 
                                    aiBadge.style.background = "rgba(168, 85, 247, 0.2)";
                                    aiBadge.style.color = "#a855f7";
                                    aiBadge.style.border = "1px solid #a855f7";
                                }, 1500);
                            }
                        });
                    });
                });
            }
        });

        const btnSaveConfig = document.getElementById('btn-save-config');
        if (btnSaveConfig) {
            btnSaveConfig.addEventListener('click', () => {
                const newConfig = {
                    avatarUrl: selectedAvatarUrl,
                    aiModel: document.getElementById('user-ai-model') ? document.getElementById('user-ai-model').value : "deepseek/deepseek-chat",
                    routeMode: document.getElementById('user-route-mode') ? document.getElementById('user-route-mode').value : "standard",
                    riskProfile: document.getElementById('user-risk-profile') ? document.getElementById('user-risk-profile').value : "safe",
                    holoEnabled: document.getElementById('user-holo-toggle') ? document.getElementById('user-holo-toggle').checked : true
                };

                chrome.storage.local.set({ userConfig: newConfig }, () => {
                    btnSaveConfig.style.background = '#00e676';
                    btnSaveConfig.innerHTML = "SAVED!"; 
                    
                    setTimeout(() => {
                        btnSaveConfig.style.background = 'linear-gradient(90deg, #00ffcc, #00b38f)';
                        btnSaveConfig.innerHTML = "SAVE SETTINGS"; 
                        
                        document.getElementById('tab-radar').click();
                    }, 1000); 
                });
            });
        }

        const btnUpgrade = document.getElementById('btn-upgrade'); 
        if (btnUpgrade) {
            btnUpgrade.addEventListener('click', () => {
                window.open('https://www.memesaver.lol/dashboard/wallet', '_blank'); 
            });
        }

        const btnSaveSync = document.getElementById('btn-save-sync');
        const btnLogoutSync = document.getElementById('btn-logout-sync');
        
        if (btnSaveSync) {
            chrome.storage.local.get(['userAuthToken'], (res) => {
                const badge = document.getElementById('account-status-badge');
                if (res.userAuthToken) {
                    if(document.getElementById('user-sync-key')) document.getElementById('user-sync-key').value = res.userAuthToken;
                    if(badge) {
                        badge.innerText = "VERIFIED";
                        badge.style.color = "#00e676";
                        badge.style.borderColor = "#00e676";
                        badge.style.background = "rgba(0, 230, 118, 0.1)";
                    }
                    btnSaveSync.style.display = 'none'; 
                    if(btnLogoutSync) btnLogoutSync.style.display = 'block'; 
                } else {
                    if(badge) {
                        badge.innerText = "FREE TIER";
                        badge.style.color = "#aaa";
                        badge.style.borderColor = "#444";
                        badge.style.background = "rgba(170, 170, 170, 0.1)";
                    }
                    btnSaveSync.style.display = 'block';
                    if(btnLogoutSync) btnLogoutSync.style.display = 'none';
                }
            });

            btnSaveSync.addEventListener('click', () => {
                const keyInput = document.getElementById('user-sync-key');
                const key = keyInput ? keyInput.value.trim() : "";
                
                if (!key) {
                    showPremiumModal("Input Required", "Please paste a Sync Key before syncing!", false);
                    return;
                }

                if (!key.startsWith("ms-pro-") && !key.startsWith("ms-premium-") && key !== "ms-admin-GODMODE-777") {
                    showPremiumModal("Invalid Sync Key", "The key you entered is incorrect. Please copy the valid key from your Web Dashboard.", false);
                    return;
                }

                chrome.storage.local.get(['device_fingerprint'], (res) => {
                    let fp = res.device_fingerprint;
                    if (!fp) {
                        fp = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
                        chrome.storage.local.set({ device_fingerprint: fp });
                    }

                    chrome.storage.local.set({ userAuthToken: key }, () => {
                        btnSaveSync.innerText = "Done!";
                        btnSaveSync.style.background = "#00e676";
                        btnSaveSync.style.color = "#000";
                        
                        setTimeout(() => { location.reload(); }, 1000);
                    });
                });
            });

            if (btnLogoutSync) {
                btnLogoutSync.addEventListener('click', () => {
                    showPremiumModal(
                        "Disconnect Account?", 
                        "Are you sure you want to remove your Sync Key? You will be reverted to the FREE plan and daily limits.", 
                        true, 
                        () => {
                            chrome.storage.local.remove('userAuthToken', () => {
                                console.log("Account scollegato!");
                                location.reload(); 
                            });
                        }
                    );
                });
            }
        }
        
        const toggleVisibilityBtn = document.getElementById('toggle-key-visibility');
        const keyInput = document.getElementById('user-sync-key');
        
        if (toggleVisibilityBtn && keyInput) {
            toggleVisibilityBtn.addEventListener('click', () => {
                if (keyInput.type === 'password') {
                    keyInput.type = 'text'; 
                    toggleVisibilityBtn.style.color = '#00ffcc'; 
                } else {
                    keyInput.type = 'password'; 
                    toggleVisibilityBtn.style.color = '#666'; 
                }
            });
        }
    
        const langBtns = document.querySelectorAll('.lang-btn');
        langBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newLang = e.currentTarget.getAttribute('data-lang');
                if (newLang !== currentLang) {
                    chrome.storage.local.remove(['ultimoRisultatoScan', 'ultimoTokenScansionato', 'ultimoScanLang'], () => {
                        chrome.storage.local.set({ userLanguage: newLang }, () => {
                            location.reload(); 
                        });
                    });
                }
            });
        });

        const btnRicarica = document.getElementById('btn-ricarica');
        if (btnRicarica) {
            btnRicarica.addEventListener('click', () => {
                chrome.storage.local.remove(['ultimoTokenScansionato', 'ultimoRisultatoScan'], avviaRadar);
            });
        }

        const btnCopilot = document.getElementById('btn-copilot');
        const copilotResult = document.getElementById('copilot-result');

        if (btnCopilot) {
            btnCopilot.addEventListener('click', async () => {
                btnCopilot.innerText = t('copilot_analyzing');
                btnCopilot.style.background = "#555";
                btnCopilot.style.pointerEvents = "none";
                copilotResult.style.display = "block";
                copilotResult.innerHTML = "<span style='color:#888; display:block; text-align:center;'>" + t('loading_analysis') + "</span>";

                chrome.storage.local.get(['userAuthToken', 'device_fingerprint', 'ultimoRisultatoScan'], async (res) => {
                    const authToken = res.userAuthToken ? String(res.userAuthToken).trim() : "null";
                    const deviceId = res.device_fingerprint ? String(res.device_fingerprint).trim() : "null";
                    const langParam = typeof currentLang !== 'undefined' ? currentLang : 'en';
                    const storageConfig = await chrome.storage.local.get(['userConfig']);
                    const currentAiModel = storageConfig.userConfig?.aiModel || "deepseek/deepseek-chat";
                    
                    const judgeStaticData = res.ultimoRisultatoScan || null;

                    try {
                        const payloadDatiLive = window.liveMetrics || { buyVol: 0, sellVol: 0, buyPressure: 50 };
                        
                        const resp = await fetch(`https://help-trading-production.up.railway.app/api/copilot/${tokenMint}?lang=${langParam}`, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json', 
                                "x-auth-token": authToken,
                                "x-device-id": deviceId,
                                "x-ai-model": currentAiModel
                            },
                            body: JSON.stringify(payloadDatiLive)
                        });
                        
                        const dataResp = await resp.json();
                        
                        if (dataResp.success === false) {
                            let actionButtonHtml = "";
                            if (dataResp.azione === "UPGRADE") {
                                actionButtonHtml = `
                                    <a href="https://www.memesaver.lol/dashboard/pricing" target="_blank" style="display: block; text-align: center; padding: 8px; border: 1px solid #ffaa00; color: #000; background: linear-gradient(90deg, #ffaa00, #ff8800); font-weight: 900; border-radius: 6px; text-decoration: none; text-transform: uppercase; cursor: pointer; transition: 0.2s; box-shadow: 0 0 15px rgba(255, 170, 0, 0.4);">
                                        💎 UPGRADE NOW
                                    </a>
                                `;
                            }

                            copilotResult.innerHTML = `
                                <div style="margin-bottom: 12px;">
                                    <strong style="color:#ff4d4d;">${dataResp.tattica || "BLOCCO IA"}</strong><br>
                                    <span style="color:#e0e0e0; font-size: 13px; display: inline-block; margin-top: 5px;">
                                        ${dataResp.puntoRottura || "Limite raggiunto"}
                                    </span>
                                </div>
                                ${actionButtonHtml}
                            `;
                            
                            const badge = document.getElementById('ai-lock-badge') || document.getElementById('ai-premium-badge');
                            if (badge) {
                                badge.innerText = "🚫 LIMIT (0/5)";
                                badge.style.color = "#ff4d4d";
                                badge.style.border = "1px solid #ff4d4d";
                                badge.style.background = "rgba(255, 77, 77, 0.1)";
                            }
                            
                        } else {
                            // 🟢 INIEZIONE OLOGRAMMA VIA CONTENT SCRIPT
                            // 🟢 INIEZIONE OLOGRAMMA VIA CONTENT SCRIPT
                            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                if (tabs && tabs[0]) {
                                    chrome.tabs.sendMessage(tabs[0].id, {
                                        action: "INJECT_HOLOGRAM",
                                        copilotData: dataResp,
                                        staticData: judgeStaticData,
                                        avatarUrl: selectedAvatarUrl,
                                        liveMetrics: window.liveMetrics // <--- SOSTITUISCI QUESTA RIGA! (prima c'era buyPressure)
                                    });
                                }
                            });
                            let tattica = traduciDalBackend(dataResp.tattica || "Error AI");
                            let puntoRottura = traduciDalBackend(dataResp.puntoRottura || "Data Unreadable");
                            let azione = traduciDalBackend(dataResp.azione || "ATTESA");
                            
                            const isSell = azione.toUpperCase().match(/FUGG|VEND|SELL|AVOID|卖|VENDRE/);
                            const isBuy = azione.toUpperCase().match(/COMPR|BUY|买|ACHET/);
                            let actionColor = isSell ? "#ff4d4d" : (isBuy ? "#00e676" : "#ffaa00");
                            
                            copilotResult.innerHTML = `
                                <div style="margin-bottom: 8px;"><strong style="color:#b366ff;">${t('tactics')}</strong><br><span style="color:#e0e0e0;">${tattica}</span></div>
                                <div style="margin-bottom: 10px;"><strong style="color:#ffaa00;">${t('prediction')}</strong><br><span style="color:#e0e0e0;">${puntoRottura}</span></div>
                                <div style="text-align: center; padding: 6px; border: 1px solid ${actionColor}; color: ${actionColor}; font-weight: bold; border-radius: 4px;">${t('action')} ${azione}</div>
                            `;

                            const badge = document.getElementById('ai-lock-badge') || document.getElementById('ai-premium-badge');
                            if (badge) {
                                if (dataResp.plan === 'free' && dataResp.scansLeft !== undefined) {
                                    badge.innerText = `🆓 FREE (${dataResp.scansLeft}/5)`;
                                    badge.style.color = "#fff";
                                    badge.style.background = "#222";
                                    badge.style.border = "1px solid #444";
                                } else if (dataResp.plan === 'premium' || dataResp.plan === 'pro' || dataResp.plan === 'admin') {
                                    badge.innerText = "💎 UNLIMITED";
                                }
                            }
                        }

                    } catch(e) {
                        copilotResult.innerHTML = `<div style="text-align:center; color:#ff4d4d; font-weight:bold;">⚠️ Error: ${e.message}</div>`;
                    } finally {
                        btnCopilot.innerText = t('copilot_reanalyze');
                        btnCopilot.style.background = "#b366ff";
                        btnCopilot.style.pointerEvents = "auto";
                    }
                });
            });
        }
    }

    function popolaInterfacciaStatica(data, tokenMint) {
        
        // ==========================================
        // 🔥 FIX EVM: ORDER FLOW & LIVE TAPE
        // ==========================================
        if (data.isEVM) {
            if (typeof timerNoiaExtension !== 'undefined') clearTimeout(timerNoiaExtension);
            
            const orderFlowBox = document.getElementById('flow-percentage');
            if (orderFlowBox) {
                orderFlowBox.innerHTML = "AWAITING NODE";
                orderFlowBox.style.color = "#ffaa00";
                orderFlowBox.style.background = "rgba(255, 170, 0, 0.1)";
                
                const barGreen = document.getElementById('flow-bar-green');
                if(barGreen) {
                    barGreen.style.width = "100%";
                    barGreen.style.background = "repeating-linear-gradient(45deg, #ffaa00, #ffaa00 10px, #cc8800 10px, #cc8800 20px)";
                }
                
                const flowBuy = document.getElementById('flow-vol-buy');
                const flowSell = document.getElementById('flow-vol-sell');
                if(flowBuy) flowBuy.innerHTML = `<span style="color:#aaa;">IN: EVM CHAIN</span>`;
                if(flowSell) flowSell.innerHTML = `<span style="color:#aaa;">OUT: PENDING</span>`;
            }
            
            const liveTapeBox = document.getElementById('live-tape-list');
            if (liveTapeBox) {
                liveTapeBox.style.display = "block"; 
                liveTapeBox.style.overflowY = "auto";
                liveTapeBox.style.height = "160px";
                
                liveTapeBox.innerHTML = `
                    <div style="text-align:center; padding: 15px 10px; margin-top: 5px; border: 1px dashed #ffaa00; background: rgba(255, 170, 0, 0.05); border-radius: 6px;">
                        <span style="font-size: 1.8em; display: block; margin-bottom: 8px;">⚠️</span>
                        <strong style="color:#ffaa00; font-family: monospace; font-size: 1.1em;">EVM CHAIN DETECTED</strong><br><br>
                        <span style="color:#aaa; font-size: 0.8em; font-family: monospace; line-height: 1.5; display:block;">
                            Live Blockchain Tape & HFT Order Flow are optimized exclusively for Solana (Helius RPC).<br><br>
                            <span style="color:#ffaa00; font-weight: bold;">Awaiting EVM Node integration.</span>
                        </span>
                    </div>
                `;
            }
        }

        // ==========================================
        // 📊 HUD STATS & STATIC ANALYSIS
        // ==========================================
        const hudStats = document.getElementById('hud-stats-container');
        if (hudStats && data.hud) {
            document.getElementById('hud-header').style.borderBottom = `2px solid ${data.hud.color}`;
            hudStats.style.display = 'flex'; 
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

        const mintStatus = document.getElementById('mint-loading-status');
        if (mintStatus) {
            mintStatus.innerHTML = t('loading_base');
            mintStatus.style.color = `#00e676`;
            mintStatus.style.animation = `none`;
        }

        const staticBox = document.getElementById('static-analysis-box');
        if (!staticBox) return;
        
        let reportHTML = "";
        if (data.advice) {
            
            // 🛡️ FIX: FALLBACK MULTIPLO
            // Se l'IA restituisce stringhe vuote, "Unknown" o errori di rate-limit, 
            // andiamo a pescare forzatamente la metrica matematica cruda estratta dal Nodo RPC.
            let devText = traduciDalBackend(data.advice.devStatus || "");
            if (!devText || devText.length < 5 || devText.toUpperCase().includes("UNKNOWN") || devText.toUpperCase().includes("SCONOSCIUTO") || devText.includes("Rate Limit")) {
                devText = traduciDalBackend(data.devHistory?.status || "DEV: FRESH OR UNMAPPED");
            }
            
            let bundleText = traduciDalBackend(data.advice.topHoldersStatus || "");
            if (!bundleText || bundleText.length < 5 || bundleText.toUpperCase().includes("UNKNOWN") || bundleText.toUpperCase().includes("SCONOSCIUTO") || bundleText.includes("Rate Limit")) {
                bundleText = traduciDalBackend(data.bundleShield?.indicatoreTesto || "Top holders distribution unverified.");
            }

            let devColor = '#00ffcc'; 
            let devIcon = '👨‍💻';
            
            if (devText.toUpperCase().match(/GIOVAN|FRESH|GIORNI|DAYS|NEW/)) {
                devColor = '#ff4d4d'; 
                devIcon = '🚨';
                devText += ` <br><span style='display:inline-block; margin-top:4px; color:#ff4d4d; font-size:0.9em; font-weight:bold; background:rgba(255,77,77,0.1); padding:2px 6px; border-radius:4px;'>${t('high_risk_rug')}</span>`;
            } else if (devText.toUpperCase().match(/SERIAL|FARMER/)) {
                devColor = '#ffaa00'; 
                devIcon = '⚠️';
            }

            let bundleColor = bundleText.toUpperCase().match(/ATTENZIONE|RISCHIO|0%|RISK/) ? '#ffaa00' : '#00ffcc';
            
            if (bundleText.includes('0%')) {
                bundleColor = '#ffaa00'; 
                bundleText += ` <br><span style='display:inline-block; margin-top:4px; color:#ffaa00; font-size:0.9em; font-weight:bold; background:rgba(255,170,0,0.1); padding:2px 6px; border-radius:4px;'>${t('risk_bundle')}</span>`;
            }
            
            reportHTML += `
                <div style="display: flex; gap: 10px; margin-bottom: 15px; align-items: stretch; width: 100%; box-sizing: border-box;">
                    <div style="flex: 1; background: linear-gradient(180deg, #161821, #0a0c10); border-top: 3px solid ${devColor}; padding: 12px; border-radius: 6px; border: 1px solid #1a1c29; box-shadow: 0 4px 6px rgba(0,0,0,0.4); display: flex; flex-direction: column;">
                        <div style="font-size: 0.7em; color: #888; text-transform: uppercase; font-weight: 900; margin-bottom: 8px; letter-spacing: 1px; display:flex; align-items:center; gap:6px;">
                            <span style="font-size: 1.3em;">${devIcon}</span>
                            <span style="color: ${devColor}; margin-top: 2px;">${t('dev_history')}</span>
                        </div>
                        <div style="font-size: 0.85em; color: #e4e4e7; font-family: monospace; line-height: 1.4;">${devText}</div>
                    </div>
                    
                    <div style="flex: 1; background: linear-gradient(180deg, #161821, #0a0c10); border-top: 3px solid ${bundleColor}; padding: 12px; border-radius: 6px; border: 1px solid #1a1c29; box-shadow: 0 4px 6px rgba(0,0,0,0.4); display: flex; flex-direction: column;">
                        <div style="font-size: 0.7em; color: #888; text-transform: uppercase; font-weight: 900; margin-bottom: 8px; letter-spacing: 1px; display:flex; align-items:center; gap:6px;">
                            <span style="font-size: 1.3em;">🛡️</span>
                            <span style="color: ${bundleColor}; margin-top: 2px;">${t('supply_analysis')}</span>
                        </div>
                        <div style="font-size: 0.85em; color: #e4e4e7; font-family: monospace; line-height: 1.4;">${bundleText}</div>
                    </div>
                </div>`;
        }
        staticBox.innerHTML = reportHTML;
    }

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

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 0.75em; color: #c084fc; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">VERDICT</span>
                <span id="judge-timer" style="background:#4a2b66; color:#fff; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.8em; font-weight:bold;">0.0s</span>
            </div>
            <div style="text-align: center; padding: 10px; color: #c084fc;">
                <span style="animation: pulseGlow 1.5s infinite; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">PROCESSING...</span>
                <div style="font-size: 0.75em; color: #888; margin-top: 6px;">Analyzing on-chain metrics</div>
            </div>
        `;

        let sec = 0;
        const timerInterval = setInterval(() => {
            sec += 0.1;
            const timerEl = document.getElementById('judge-timer');
            if(timerEl) timerEl.innerText = sec.toFixed(1) + 's';
        }, 100);

        try {
            const storageRes = await chrome.storage.local.get(['userAuthToken', 'device_fingerprint', 'userConfig']);
            const authToken = storageRes.userAuthToken ? String(storageRes.userAuthToken).trim() : "null";
            const deviceId = storageRes.device_fingerprint ? String(storageRes.device_fingerprint).trim() : "null";
            const requestedAi = storageRes.userConfig?.aiModel || "deepseek/deepseek-chat";

            const response = await fetch(`https://help-trading-production.up.railway.app/api/laboratorio/${tokenMint}?lang=${currentLang}`, {
                headers: { 
                    "x-auth-token": authToken, 
                    "x-device-id": deviceId,
                    "x-ai-model": requestedAi 
                }
            });
            
            const data = await response.json();
            clearInterval(timerInterval);

            if (data.success) {
                let tweetVerdict = data.verdetto.includes('RIDE') ? 'RIDE (Safe)' : (data.verdetto.includes('SCALP') ? 'SCALP (Risky)' : 'AVOID (Trap)');
                const cleanHTML = data.verdetto.replace(/⚖️|⏳|🔄|💎|🚫|⚠️|❌|🚨|🛡️|👨‍💻|🏄‍♂️|⚡|🛑/g, '');
                
                let isEVM = tokenMint.startsWith("0x");
                let chainTag = isEVM ? "#EVM #Base" : "#Solana #PumpFun";
                
                let trustScore = 50;
                const scoreMatch = data.verdetto.match(/>(\d{1,3})<\/span><span[^>]*>Trust/i);
                if (scoreMatch && scoreMatch[1]) {
                    trustScore = parseInt(scoreMatch[1]);
                } else if (data.score) {
                    trustScore = data.score;
                }

                let rawShareText = `🤖 Meme Saver AI Scan\n\n🪙 CA: ${tokenMint.substring(0,8)}...\n⚖️ Verdict: ${tweetVerdict}\n📊 Trust Score: ${trustScore}/100\n\nStop being exit liquidity 👇\n🔗 memesaver.lol\n\n${chainTag} @H3lpTrading `;
                let encodedTweetText = encodeURIComponent(rawShareText);

                container.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 0.75em; color: #c084fc; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">VERDICT</span>
                        <div style="display:flex; gap: 6px; align-items:center;">
                            <span style="color:#888; font-family:monospace; font-size:0.7em;">DONE IN ${sec.toFixed(1)}s</span>
                            <button id="btn-refresh-judge" style="background: #c084fc; color: #000; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.7em; text-transform:uppercase;">RELOAD</button>
                        </div>
                    </div>
                    ${traduciDalBackend(cleanHTML)}
                    
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <button id="btn-share-x" style="flex: 2; display: flex; align-items: center; justify-content: center; gap: 8px; background: #000; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 6px; font-weight: bold; font-size: 0.8em; cursor: pointer; transition: background 0.2s;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.005 4.150h-1.91z"/></svg>
                            Share on X
                        </button>
                        <button id="btn-copy-verdict" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background: #1a1c29; border: 1px solid #2d3142; color: #4da6ff; padding: 8px; border-radius: 6px; font-weight: bold; font-size: 0.8em; cursor: pointer; transition: background 0.2s;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Copy
                        </button>
                    </div>
                `;

                document.getElementById('btn-refresh-judge').addEventListener('click', () => avviaLaboratorioGemini(tokenMint));
                
                // 🔥 FIX: Funzione centralizzata per generare il testo dinamico per entrambi i pulsanti
                const generaTestoCondivisione = async () => {
                    let liveMC = "N/A";
                    try {
                        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
                        const dexData = await dexRes.json();
                        if (dexData.pairs && dexData.pairs.length > 0) {
                            const fdv = dexData.pairs[0].fdv || dexData.pairs[0].marketCap;
                            liveMC = "$" + (fdv >= 1000000 ? (fdv/1000000).toFixed(2) + "M" : (fdv/1000).toFixed(1) + "K");
                        } else {
                            const pumpRes = await fetch(`https://frontend-api.pump.fun/coins/${tokenMint}`);
                            if (pumpRes.ok) {
                                const pumpData = await pumpRes.json();
                                if (pumpData.usd_market_cap) {
                                    const fdv = pumpData.usd_market_cap;
                                    liveMC = "$" + (fdv >= 1000000 ? (fdv/1000000).toFixed(2) + "M" : (fdv/1000).toFixed(1) + "K");
                                }
                            }
                        }
                    } catch(err) {} 

                    return `🤖 Meme Saver AI Scan\n\n🪙 CA: ${tokenMint}\n💎 Market Cap: ${liveMC}\n⚖️ Verdict: ${tweetVerdict}\n📊 Trust Score: ${trustScore}/100\n\nStop being exit liquidity 👇\n🔗 memesaver.lol\n\n${chainTag} @H3lpTrading`;
                };

                document.getElementById('btn-share-x').addEventListener('click', async (e) => {
                    const btn = e.currentTarget;
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<span style="animation: pulseGlow 1s infinite;">FETCHING DATA...</span>';
                    btn.style.pointerEvents = "none";
                    
                    const rawShareText = await generaTestoCondivisione();
                    
                    btn.innerHTML = originalHTML;
                    btn.style.pointerEvents = "auto";
                    
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(rawShareText)}`, '_blank');
                });

                document.getElementById('btn-copy-verdict').addEventListener('click', async (e) => {
                    const btn = e.currentTarget;
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<span style="animation: pulseGlow 1s infinite;">FETCHING...</span>';
                    btn.style.pointerEvents = "none";

                    const rawShareText = await generaTestoCondivisione();

                    navigator.clipboard.writeText(rawShareText).then(() => {
                        btn.innerHTML = '<span style="color:#00e676;">COPIED!</span>';
                        setTimeout(() => {
                            btn.innerHTML = originalHTML;
                            btn.style.pointerEvents = "auto";
                        }, 2000);
                    });
                });

                const mintStatus = document.getElementById('mint-loading-status');
                if (mintStatus) {
                    mintStatus.innerHTML = "REPORT READY";
                    mintStatus.style.color = "#00e676";
                }

                const badge = document.getElementById('ai-premium-badge') || document.getElementById('ai-lock-badge');
                if (badge) {
                    if (data.plan === 'free') {
                        badge.innerText = `FREE (${data.scansLeft}/5)`;
                        badge.style.color = "#fff";
                        badge.style.background = "#222";
                        badge.style.border = "1px solid #444";
                    } else if (data.plan === 'premium' || data.plan === 'pro' || data.plan === 'admin') {
                        badge.innerText = "UNLIMITED";
                        badge.style.color = "#a855f7";
                        badge.style.background = "rgba(168, 85, 247, 0.2)";
                        badge.style.border = "1px solid #a855f7";
                    }
                }

            } else if (data.limitReached || data.success === false) {
                
                const errorStr = String(data.verdetto || data.puntoRottura || data.message || data.tattica || "");
                const isSecurityLock = errorStr.toLowerCase().includes("proton.me") || errorStr.toLowerCase().includes("discord");

                const isLimitReached = !isSecurityLock && (
                                       data.azione === "UPGRADE" 
                                    || errorStr.toLowerCase().includes("limit") 
                                    || errorStr.toLowerCase().includes("exhausted")
                                    || errorStr.toLowerCase().includes("flying blind")
                                    || errorStr.toLowerCase().includes("too many requests")
                                    || errorStr.includes("0/5")
                );

                if (isLimitReached) {
                    // 🔥 FIX 3: Reindirizzamento diretto alla pagina di pagamento (/pricing)
                    container.innerHTML = `
                        <div style="background: linear-gradient(145deg, #1a1500, #0a0c10); border: 1px solid #ffaa00; border-radius: 8px; padding: 25px 20px; text-align: center; font-family: 'Segoe UI', sans-serif;">
                            <div style="font-size: 3em; margin-bottom: 10px; filter: drop-shadow(0 0 10px rgba(255,170,0,0.4)); line-height: 1;"></div>
                            <div style="color: #ffaa00; font-size: 1.2em; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Daily Limit Reached</div>
                            <div style="color: #e4e4e7; font-size: 0.85em; line-height: 1.5; margin-bottom: 20px;">
                                You have exhausted your 5 free AI scans for today.<br>Connect a <b style="color:#00ffcc;">Pro</b> or <b style="color:#b366ff;">Premium</b> account to unlock unlimited institutional forensics.
                            </div>
                            <a href="https://www.memesaver.lol/dashboard/pricing" target="_blank" style="display: inline-block; background: linear-gradient(90deg, #ffaa00, #ff8800); color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(255, 170, 0, 0.4); transition: transform 0.2s;">
                                 💎 Upgrade to Premium
                            </a>
                        </div>
                    `;
                } else {
                    let cleanErrorHTML = errorStr.replace(/🔒|❌|⚠️️|💎/g, '');
                    cleanErrorHTML = cleanErrorHTML.replace(/from this IP/gi, 'from your network'); 
                    cleanErrorHTML = cleanErrorHTML.replace(/\bIP\b/gi, 'Network'); 
                    cleanErrorHTML = cleanErrorHTML.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, ''); 
                    
                    // 🔥 FIX 4: Box grafico dedicato per i blocchi Device / Cambio PC
                    if (isSecurityLock) {
                        container.innerHTML = `
                        <div style="background: linear-gradient(145deg, #1a0505, #0a0c10); border: 1px solid #ff4d4d; border-radius: 8px; padding: 20px; text-align: center; font-family: 'Segoe UI', sans-serif;">
                            <div style="font-size: 2.5em; margin-bottom: 10px;">🔒</div>
                            <div style="color: #ff4d4d; font-size: 1.1em; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Security Lock</div>
                            <div style="color: #e4e4e7; font-size: 0.85em; line-height: 1.6;">
                                ${cleanErrorHTML.trim()}
                            </div>
                            <a href="https://discord.gg/J9wsre2Mz" target="_blank" style="display: inline-block; margin-top: 15px; background: #5865F2; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 0.85em; transition: 0.2s;">
                                 Open Discord Ticket
                            </a>
                        </div>`;
                    } else {
                        // Errori generici
                        container.innerHTML = `<div style="color:#ff4d4d; padding:15px; text-align:center; border: 1px solid #ff4d4d; border-radius: 8px; background: rgba(255,77,77,0.1); font-weight:bold;">${cleanErrorHTML.trim() || "ANALYSIS FAILED"}</div>`;
                    }
                }

                const badge = document.getElementById('ai-premium-badge') || document.getElementById('ai-lock-badge');
                if (badge) {
                    badge.innerText = "LIMIT (0/5)";
                    badge.style.color = "#ff4d4d";
                    badge.style.border = "1px solid #ff4d4d";
                    badge.style.background = "rgba(255, 77, 77, 0.1)";
                }
            } else {
                container.innerHTML = `<div style="color:#ff4d4d; padding:10px; font-weight:bold; text-transform:uppercase;">ERROR AI: PARSING FAILED</div>`;
            }
        } catch (error) {
            clearInterval(timerInterval);
            container.innerHTML = `
                <div style="color:#ff4d4d; padding:15px; text-align:center; font-weight:bold; text-transform:uppercase; letter-spacing: 1px;">
                    CONNECTION ERROR
                    <button id="btn-retry-judge" style="display:block; margin: 12px auto 0; background: #ff4d4d; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8em; text-transform: uppercase; letter-spacing: 1px;">RETRY</button>
                </div>`;
            document.getElementById('btn-retry-judge').addEventListener('click', () => avviaLaboratorioGemini(tokenMint));
        }
    }

    function inizializzaTracker() {
        const btnAdd = document.getElementById('add-wallet-btn');
        if (!btnAdd) return;
        
        btnAdd.addEventListener('click', () => {
            const addressInput = document.getElementById('new-wallet-input');
            const nameInput = document.getElementById('new-wallet-name');
            const address = addressInput ? addressInput.value.trim() : "";
            const name = nameInput && nameInput.value.trim() !== "" ? nameInput.value.trim() : "Sconosciuto";
            
            if (address.length < 32) {
                addressInput.style.border = "1px solid #ff4d4d";
                setTimeout(() => addressInput.style.border = "1px solid #2d3142", 2000);
                return;
            }

            chrome.storage.local.get(['trackedWallets'], (res) => {
                let wallets = res.trackedWallets || [];
                wallets = wallets.map(w => typeof w === 'string' ? { address: w, name: "Sconosciuto" } : w);
                
                if (!wallets.find(w => w.address === address)) {
                    wallets.push({ address: address, name: name });
                    chrome.storage.local.set({ trackedWallets: wallets }, () => {
                        addressInput.value = '';
                        if(nameInput) nameInput.value = '';
                        loadSavedWallets(); 
                    });
                }
            });
        });
    }

    function loadSavedWallets() {
        const list = document.getElementById('tracked-wallets-list');
        if (!list) return;
        
        chrome.storage.local.get(['trackedWallets'], (res) => {
            let wallets = res.trackedWallets || [];
            window.activeTrackedWallets = wallets.map(w => typeof w === 'string' ? { address: w, name: "Unknown" } : w); 
            list.innerHTML = '';
            
            if (window.activeTrackedWallets.length === 0) {
                list.innerHTML = `<div style="text-align:center; color:#888; padding: 10px; font-style: italic;">No wallets tracked.</div>`;
                return;
            }

            window.activeTrackedWallets.forEach((walletData, index) => {
                const div = document.createElement('div');
                div.style.cssText = "display:flex; justify-content:space-between; align-items:center; background: rgba(0,0,0,0.3); padding: 8px; border: 1px solid #2d3142; border-radius: 6px; margin-bottom: 6px;";
                
                const bellIcon = walletData.notify !== false ? '🔔' : '🔕';
                const bellColor = walletData.notify !== false ? '#ffaa00' : '#555';

                div.innerHTML = `
                    <div style="display:flex; flex-direction:column; overflow:hidden;">
                        <span style="color:#00ffcc; font-weight:bold; font-size:1.1em;">${walletData.name}</span>
                        <span style="color:#888; font-family:monospace; font-size:0.85em;">${walletData.address.substring(0, 6)}...${walletData.address.slice(-6)}</span>
                    </div>
                    <div style="display:flex; gap: 8px; align-items:center;">
                        <button class="btn-notify-wallet" data-idx="${index}" style="background: transparent; color:${bellColor}; border: none; cursor:pointer; font-size:1.2em; transition:0.2s;" title="On/Off Notifiche">${bellIcon}</button>
                        <button class="btn-del-wallet" data-idx="${index}" style="background: transparent; color:#ff4d4d; border: 1px solid #ff4d4d; border-radius:4px; padding:4px 8px; cursor:pointer; transition:0.2s; font-weight:bold; font-size:0.8em;">✕</button>
                    </div>
                `;
                list.appendChild(div);
            });

            document.querySelectorAll('.btn-notify-wallet').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = e.currentTarget.getAttribute('data-idx');
                    window.activeTrackedWallets[idx].notify = window.activeTrackedWallets[idx].notify === false ? true : false;
                    chrome.storage.local.set({ trackedWallets: window.activeTrackedWallets }, loadSavedWallets);
                });
            });

            document.querySelectorAll('.btn-del-wallet').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const el = e.target;
                    const idx = el.getAttribute('data-idx');
                    
                    if (el.innerText === '✕') {
                        el.innerText = 'Sicuro?';
                        el.style.background = '#ff4d4d';
                        el.style.color = '#fff';
                        setTimeout(() => {
                            if(el && el.innerText === 'Sicuro?') { 
                                el.innerText = '✕'; el.style.background = 'transparent'; el.style.color = '#ff4d4d'; 
                            }
                        }, 3000);
                    } else {
                        window.activeTrackedWallets.splice(idx, 1);
                        chrome.storage.local.set({ trackedWallets: window.activeTrackedWallets }, loadSavedWallets);
                    }
                });
            });
        });
    }

    function aggiungiSpyCardHTML(data, isNew) {
        const feed = document.getElementById('spy-feed-list');
        if (!feed) return;
        if (feed.innerHTML.includes('attesa') || feed.innerHTML.includes('aiting') || feed.innerHTML.includes('等待') || feed.innerHTML.includes('Écoute')) {
            feed.innerHTML = '';
        }

        let esitoGrezzo = data.esito || (data.type === "BUY" ? " BOUGHT" : " SOLD");
        let motivoGrezzo = data.motivo || (data.stats ? data.stats.classificazione : "");
        if (data.strategy && data.solSpent) motivoGrezzo += ` - Investment: ${data.solSpent.toFixed(2)} SOL`;
        else if (!data.esito && data.type !== "BUY") motivoGrezzo = "Exiting position";

        let translatedEsito = traduciDalBackend(esitoGrezzo);
        let translatedMotivo = traduciDalBackend(motivoGrezzo);
        
        let color = data.colore || (data.strategy ? data.strategy.color : (data.type === "BUY" ? "#00ffcc" : "#ff4d4d"));
        let timeText = data.orario || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let wallet = data.walletSpia || data.walletName || "Unknown";
        let mint = data.mint || "";

        const card = document.createElement('div');
        card.style.cssText = `
            background: #0a0c10; 
            border-left: 4px solid ${color}; 
            border-top: 1px solid #1a1c29; border-right: 1px solid #1a1c29; border-bottom: 1px solid #1a1c29;
            padding: 8px; border-radius: 6px; margin-bottom: 8px; 
            font-family: monospace; font-size: 0.75em;
            display: flex; flex-direction: column; gap: 6px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        `;
        
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <span style="color:${color}; font-weight:900; font-size:1.05em; line-height: 1.2;">
                    ${translatedEsito}
                </span>
                <span style="color:#666; font-size: 0.85em; font-weight:bold; white-space:nowrap; margin-left: 5px;">🕒 ${timeText}</span>
            </div>
            
            <div style="background: #12151f; padding: 6px; border-radius: 4px; color:#00ffcc; font-weight: bold; border: 1px solid #1a1c29;">
                ${translatedMotivo}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 2px;">
                <span style="color:#aaa;">Wallet: <strong style="color:#fff;">${wallet.substring(0,5)}...${wallet.slice(-4)}</strong></span>
                <div style="display:flex; gap: 4px;">
                    <button class="copy-spy-mint-btn" data-mint="${mint}" style="background:#2a2d3d; border:1px solid #444; color:#fff; border-radius:4px; cursor:pointer; padding:3px 6px; font-weight:bold; font-size:0.9em; transition: 0.2s;">📋 ${t('copy_mint')}</button>
                    <a href="https://pump.fun/${mint}" target="_blank" style="background:#1a1c29; color:#4da6ff; padding:3px 6px; border-radius:4px; text-decoration:none; font-weight:bold; border:1px solid #2d3142; transition: 0.2s;">💊</a>
                </div>
            </div>
        `;
        
        if (isNew) {
            feed.prepend(card);
            if (feed.children.length > 20) feed.removeChild(feed.lastChild);
        } else {
            feed.appendChild(card);
        }

        const copyBtn = card.querySelector('.copy-spy-mint-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                navigator.clipboard.writeText(e.target.getAttribute('data-mint')).then(() => {
                    e.target.innerText = "✅"; e.target.style.background = "#00e676";
                    setTimeout(() => { e.target.innerHTML = `📋 ${t('copy_mint')}`; e.target.style.background = "#2a2d3d"; }, 2000);
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
                    const response = await fetch(`https://help-trading-production.up.railway.app/api/spy-wallet/${wallet}`);
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
                feed.innerHTML = `<div style="text-align:center; color:#555; font-style:italic; padding: 20px; font-size:0.9em;">${t('spy_waiting')}</div>`;
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