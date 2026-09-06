document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');
    const masterApp = document.getElementById('master-app'); // Recuperiamo il nuovo contenitore

    // ==========================================
    // 🔍 CONTROLLO ZOOM ANTI-BUCO NERO
    // ==========================================
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');

    let currentZoom = parseFloat(localStorage.getItem('userZoom')) || 1;

    function applicaZoom() {
        if (!masterApp) return;
        document.body.style.zoom = currentZoom; // Zoomiamo tutto il pavimento
    }
    
    applicaZoom(); // Applica subito all'avvio

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

    // ... [Il resto del tuo codice WebSocket continua qui] ...

    // 🔥 1. CONNESSIONE WEBSOCKET
    // 🔥 1. CONNESSIONE WEBSOCKET
    const socket = io("https://help-trading-production.up.railway.app", {
    
    });
    socket.on("connect", () => console.log("🟢 Connesso al Radar Quantitativo WSS"));
    
    // =========================================================
    // 🚀 GOLDEN ALERT (Popup Intelligente)
    // =========================================================
    // 🧠 Inizializza la memoria anti-spam globale (viene creata una sola volta)
            if (typeof window.whaleCooldown === 'undefined') window.whaleCooldown = new Set();

            socket.off('golden_signal_found'); // 🧹 Pulisce ascoltatori vecchi per evitare raddoppiamenti
            socket.on('golden_signal_found', async (segnale) => {
                const actualMint = typeof segnale === 'string' ? segnale : (segnale.mint || "Errore_Mint");
                
                // 🛡️ FILTRO ANTI-SPAM (SALVAVITA)
                // Se questo token è già nella memoria "recente", blocca l'esecuzione e non fare nulla!
                if (window.whaleCooldown.has(actualMint)) return;
                
                // Se è nuovo, inseriscilo nella memoria
                window.whaleCooldown.add(actualMint);
                // ...e cancellalo dalla memoria dopo 120.000 millisecondi (2 minuti esatti)
                setTimeout(() => window.whaleCooldown.delete(actualMint), 120000);


                // =======================================================
                // 👇 DA QUI IN POI È IL TUO CODICE GRAFICO INTOCCATO 👇
                // =======================================================
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
                
                // RECUPERO DATI DEXSCREENER CON RISPOSTA INTELLIGENTE
                try {
                    const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${actualMint}`);
                    const dexData = await dexRes.json();
                    const pair = (dexData.pairs && dexData.pairs.length > 0) ? dexData.pairs[0] : null;
                    
                    const statsContainer = document.getElementById(`golden-stats-${actualMint}`);
                    
                    if (statsContainer && pair) {
                        const mc = pair.fdv || pair.marketCap || 0;
                        const liq = pair.liquidity?.usd || 0;
                        
                        // 🔥 Calcolo progressi della Bonding Curve di Pump.fun
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
// 🌍 MOTORE MULTILINGUA (i18n Engine - Default: EN)
// =========================================================
// =========================================================
// 🌍 MOTORE MULTILINGUA (i18n Engine)
// =========================================================
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
        nav_tracker: "Tracker", nav_spy: "Spy", btn_reload: "RELOAD", copilot_title: "🧠 Copilot AI",
        copilot_btn: "Request Analysis", copilot_analyzing: "⏳ Analyzing...", copilot_reanalyze: "🔄 Re-analyze",
        orderflow_title: "⏱️ 10s Order Flow", orderflow_waiting: "WAITING...", live_tape_title: "🔴 Live Tape",
        live_tape_listening: "Listening to blockchain...", loading_analysis: "⏳ Analyzing...",
        loading_base: "✅ Base Data", loading_complete: "✅ Full Report", tracker_title: "💼 SMART MONEY",
        tracker_placeholder: "Address...", tracker_name: "Name (opt)", tracker_btn: "Track", spy_title: "🚨 LIVE SPY FEED",
        spy_waiting: "Waiting for signals...", judge_title: "Judge Verdict", done_in: "Done in",
        dev_history: "Developer History", supply_analysis: "Supply Analysis", high_risk_rug: "⚠️ HIGH RUG RISK.",
        risk_bundle: "⚠️ BUNDLE RISK: Dev might have sniped secretly!", bought: "BOUGHT", sold: "SOLD", investment: "Investment", normal_trade: "NORMAL",
        human_trader: "Human Trader", algo_trader: "Algo Trader", exit_pos: "📉 Exiting position",
        dead_token: "💀 DEAD TOKEN 💀", dead_desc: "Zero volume for 25s. Change coin!", algo_judgment: "Algorithmic Judgment",
        tactics: "1. Tactics:", prediction: "2. Prediction:", action: "Action:",
        sybil_title: "🚨 SYBIL DUMP", sybil_msg1: "SYBIL BURST:", sybil_msg2: "wallets dumping", sybil_msg3: "SOL in 2s!",
        whale_title: "WHALE MATCH!", whale_buy: "Action: WHALE BUYING", whale_new: "⚠️ Newborn Token",
        whale_inv: "Still invisible on DexScreener. Proceed with caution.", copy_mint: "📋 Copy Mint",
        copied: "✅ Copied!", open_pump: "💊 OPEN PUMP.FUN",
        dev_unknown: "DEV: UNKNOWN", dev_launched: "tokens launched", dev_risk: "risk",
        bundle_top: "Top holders control", bundle_of: "of the bundle", bundle_no_power: "no central power"
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
        nav_tracker: "Tracker", nav_spy: "Spy", btn_reload: "RICARICA", copilot_title: "🧠 Copilota AI",
        copilot_btn: "Richiedi Analisi", copilot_analyzing: "⏳ Analisi in corso...", copilot_reanalyze: "🔄 Ri-analizza",
        orderflow_title: "⏱️ 10s Order Flow", orderflow_waiting: "IN ATTESA...", live_tape_title: "🔴 Live Tape",
        live_tape_listening: "In ascolto della blockchain...", loading_analysis: "⏳ Analisi...",
        loading_base: "✅ Dati Base", loading_complete: "✅ Report Completo", tracker_title: "💼 SMART MONEY",
        tracker_placeholder: "Address...", tracker_name: "Nome (opz)", tracker_btn: "Traccia", spy_title: "🚨 LIVE SPY FEED",
        spy_waiting: "In attesa di movimenti...", judge_title: "Verdetto Giudice", done_in: "Fatto in",
        dev_history: "Developer History", supply_analysis: "Analisi Supply", high_risk_rug: "⚠️ ALTO RISCHIO RUG.",
        risk_bundle: "⚠️ BUNDLE RISK: Dev might have sniped the supply!", bought: "HA COMPRATO", sold: "HA VENDUTO", investment: "Investimento", normal_trade: "NORMALE",
        human_trader: "Trader Umano", algo_trader: "Algo Trader", exit_pos: "📉 Uscita dalla posizione",
        dead_token: "💀 TOKEN MORTO 💀", dead_desc: "Zero volumi da 25s. Cambia moneta!", algo_judgment: "Giudizio Algoritmico",
        tactics: "1. Tattica:", prediction: "2. Previsione:", action: "Azione:",
        sybil_title: "🚨 SYBIL DUMP", sybil_msg1: "RAFFICA SYBIL:", sybil_msg2: "wallet scaricano", sybil_msg3: "SOL in 2s!",
        whale_title: "WHALE MATCH!", whale_buy: "Azione: BALENA IN ACQUISTO", whale_new: "⚠️ Token Neonato",
        whale_inv: "Ancora invisibile a DexScreener. Procedi con cautela.", copy_mint: "📋 Copia Mint",
        whale_buy: "WHALE BUYING", // Togli "Action:" da qui
        curve_title: "Pump.fun Curve:", curve_completed: "% Completed",
        tracker_action_buy: "has just BOUGHT on this coin!",
        tracker_action_sell: "has just SOLD on this coin!",
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
        btn_reload: "刷新", copilot_title: "🧠 AI 助手", copilot_btn: "请求分析",
        copilot_analyzing: "⏳ 分析中...", copilot_reanalyze: "🔄 重新分析", orderflow_title: "⏱️ 10秒订单流",
        orderflow_waiting: "等待中...", live_tape_title: "🔴 实时流水", live_tape_listening: "正在监听区块链...",
        loading_analysis: "⏳ 分析中...", loading_base: "✅ 基础数据", loading_complete: "✅ 完整报告",
        tracker_title: "💼 聪明钱追踪", tracker_placeholder: "钱包地址...", tracker_name: "名称(可选)", tracker_btn: "追踪",
        spy_title: "🚨 实时预警", spy_waiting: "等待链上信号...", judge_title: "法官裁决",
        done_in: "耗时", dev_history: "开发者历史", supply_analysis: "供应量分析",
        high_risk_rug: "⚠️ 高跑路风险.", risk_bundle: "⚠️ 老鼠仓风险!", bought: "买入", sold: "卖出", investment: "投资", normal_trade: "正常",
        human_trader: "人类交易员", algo_trader: "量化机器人", exit_pos: "📉 正在平仓",
        dead_token: "💀 死币 💀", dead_desc: "25秒内零交易量。请换币！", algo_judgment: "算法评判",
        tactics: "1. 策略:", prediction: "2. 预测:", action: "操作:",
        sybil_title: "🚨 女巫砸盘", sybil_msg1: "女巫爆发:", sybil_msg2: "个钱包正在抛售", sybil_msg3: "SOL (2秒内)!",
        whale_title: "巨鲸匹配!", whale_buy: "动作: 巨鲸买入", whale_new: "⚠️ 新生代币",
        whale_inv: "DexScreener尚未收录，请谨慎操作。", copy_mint: "📋 复制合约",
        whale_buy: "BALENA IN ACQUISTO", // Togli "Azione:" da qui
        curve_title: "Curva Pump.fun:", curve_completed: "% Completata",
        tracker_action_buy: "ha appena COMPRATO su questa moneta!",
        tracker_action_sell: "ha appena VENDUTO su questa moneta!",
        whale_buy: "巨鲸买入",
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
        nav_tracker: "Tracker", nav_spy: "Spy", btn_reload: "RECHARGER", copilot_title: "🧠 Copilote IA",
        copilot_btn: "Demander Analyse", copilot_analyzing: "⏳ Analyse...", copilot_reanalyze: "🔄 Ré-analyser",
        orderflow_title: "⏱️ Flux 10s", orderflow_waiting: "ATTENTE...", live_tape_title: "🔴 Live Tape",
        live_tape_listening: "Écoute de la blockchain...", loading_analysis: "⏳ Analyse...",
        loading_base: "✅ Données de Base", loading_complete: "✅ Rapport Complet", tracker_title: "💼 SMART MONEY",
        tracker_placeholder: "Adresse...", tracker_name: "Nom (opt)", tracker_btn: "Traquer", spy_title: "🚨 LIVE SPY FEED",
        spy_waiting: "En attente de signaux...", judge_title: "Verdict du Juge", done_in: "Fait en",
        dev_history: "Historique Dév", supply_analysis: "Analyse Offre", high_risk_rug: "⚠️ RISQUE DE RUG.",
        risk_bundle: "⚠️ RISQUE BUNDLE!", bought: "A ACHETÉ", sold: "A VENDU", investment: "Investissement", normal_trade: "NORMAL",
        human_trader: "Trader Humain", algo_trader: "Algo Trader", exit_pos: "📉 Sortie de position",
        dead_token: "💀 JETON MORT 💀", dead_desc: "Zéro volume. Changez de pièce !", algo_judgment: "Jugement Algorithmique",
        tactics: "1. Tactique :", prediction: "2. Prévision :", action: "Action :",
        sybil_title: "🚨 SYBIL DUMP", sybil_msg1: "RAFALE SYBIL :", sybil_msg2: "portefeuilles vendent", sybil_msg3: "SOL en 2s !",
        whale_title: "WHALE MATCH!", whale_buy: "Action : BALEINE EN ACHAT", whale_new: "⚠️ Jeton Nouveau-né",
        whale_inv: "Encore invisible sur DexScreener. Procédez avec prudence.", copy_mint: "📋 Copier Mint",
        whale_buy: "BALEINE EN ACHAT",
        curve_title: "Courbe Pump.fun :", curve_completed: "% Terminée",
        tracker_action_buy: "vient d'ACHETER sur cette pièce !",
        tracker_action_sell: "vient de VENDRE sur cette pièce !",
        copied: "✅ Copié !", open_pump: "💊 OUVRIR PUMP.FUN",
        dev_unknown: "DEV : INCONNU", dev_launched: "jetons lancés", dev_risk: "risque",
        bundle_top: "Top holders contrôlent", bundle_of: "du bundle", bundle_no_power: "aucun pouvoir central"
    }
};

function t(key) { return TRANSLATIONS[currentLang][key] || TRANSLATIONS['en'][key] || key; }

// 🧠 TRADUTTORE UNIVERSALE (Filtro Anti-Italiano Globale)
// 🧠 TRADUTTORE UNIVERSALE (Filtro Anti-Italiano Globale)
function traduciDalBackend(testo) {
    if (!testo) return "";
    return testo
        // --- 1. Trading & Spy Feed ---
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
        
        // --- 2. Avvisi, Radar & Sybil ---
        .replace(/TOKEN MORTO/gi, "DEAD TOKEN")
        .replace(/Zero volumi da 25s.*/gi, "Zero volume. Change coin!")
        .replace(/Giudizio Algoritmico/gi, "Algorithmic Judgment")
        .replace(/RAFFICA SYBIL:/gi, "SYBIL BURST:")
        .replace(/wallet stanno scaricando un totale di/gi, "wallets dumping a total of")
        .replace(/wallet scaricano/gi, "wallets dumping")
        .replace(/SOL in 2s!/gi, "SOL in 2s!")
        
        // --- 3. Dati Sviluppatore (Dev History) ---
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
        
        // --- 4. Dati Supply, Bundle & Micro-Dump ---
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
// 🎨 GENERATORE UNIVERSALE CARD SPY (Usato sia per la Diretta che per lo Storico)
function generaHTMLCardSpy(data) {
    let translatedEsito = traduciDalBackend(data.esito);
    let translatedMotivo = traduciDalBackend(data.motivo);
    
    // Ottiene l'orario locale (Es. 14:30:15)
    let timeText = data.orario || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `
        <div style="background: #0a0c10; border-left: 4px solid ${data.colore}; border-top: 1px solid #1a1c29; border-right: 1px solid #1a1c29; border-bottom: 1px solid #1a1c29; padding: 8px; border-radius: 6px; margin-bottom: 8px; font-family: monospace; font-size: 0.75em; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <span style="color:${data.colore}; font-weight:900; font-size:1.05em; line-height: 1.2;">${translatedEsito}</span>
                <span style="color:#666; font-size: 0.85em; font-weight:bold; white-space:nowrap; margin-left: 5px;">🕒 ${timeText}</span>
            </div>
            <div style="background: #12151f; padding: 6px; border-radius: 4px; color:#00ffcc; font-weight: bold; border: 1px solid #1a1c29;">
                ${translatedMotivo}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 2px;">
                <span style="color:#aaa;">Wallet: <strong style="color:#fff;">${data.walletSpia.substring(0,5)}...${data.walletSpia.slice(-4)}</strong></span>
                <a href="https://pump.fun/${data.mint}" target="_blank" style="background:#1a1c29; color:#4da6ff; padding:3px 8px; border-radius:4px; text-decoration:none; font-weight:bold; border:1px solid #2d3142; transition: 0.2s;">💊 PUMP.FUN</a>
            </div>
        </div>
    `;
}
// Funzione helper per ottenere il testo tradotto con fallback su Inglese
    // =========================================================
    // ⏱️ TIMER DI NOIA (AUTO-SCARTO TOKEN MORTI)
    // =========================================================
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
                        <div style="font-size: 1.2em; font-weight: 900; color: #ff4d4d; letter-spacing: 2px;">${t('dead_token')}</div>
                        <div style="font-size: 0.75em; color: #fff; margin-top: 4px;">${t('dead_desc')}</div>
                    </div>
                `;
            }
        }, 25000); 
    }

    // =========================================================
    // 📡 AVVIO E MEMORIA
    // =========================================================
    function avviaRadar() {
        // 1. PRIMA legge la lingua salvata...
        chrome.storage.local.get(['userLanguage'], (res) => {
            if (res.userLanguage) {
                currentLang = res.userLanguage; 
            } else {
                currentLang = 'en'; 
            }

            // 2. ...E SOLO DOPO avvia la scansione e costruisce l'interfaccia
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || tabs.length === 0) return;
                const url = tabs[0].url;
                
// 🔥 Cerca PRIMA un indirizzo EVM (0x + 40 caratteri esadecimali), POI cerca un indirizzo Solana (Base58)
const matchEVM = url.match(/0x[a-fA-F0-9]{40}/);
const matchSolana = url.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);

let tokenMint = null;
if (matchEVM) {
    tokenMint = matchEVM[0]; // È un token Robinhood/Base/Ethereum
} else if (matchSolana) {
    tokenMint = matchSolana[0]; // È un token Solana
}

                if (!tokenMint || tokenMint === 'board' || tokenMint === 'create') {
                    contentDiv.innerHTML = '<div style="padding: 20px; text-align:center; color:#888;">Navigate to a token to activate the Radar.</div>';
                    return;
                }

                costruisciInterfacciaLive(tokenMint);
                resettaTimerNoia();

                // 🔥 RECUPERA IL WALLET SALVATO INSIEME ALLA MEMORIA
                chrome.storage.local.get(['ultimoTokenScansionato', 'ultimoRisultatoScan', 'userConnectedWallet'], (memoria) => {
                    const userWallet = memoria.userConnectedWallet || "null";
                   

                    if (memoria.ultimoTokenScansionato === tokenMint && memoria.ultimoRisultatoScan) {
                        popolaInterfacciaStatica(memoria.ultimoRisultatoScan, tokenMint);
                        avviaLaboratorioGemini(tokenMint); 
                        
                        // 👉 FETCH IN BACKGROUND CON HEADER WALLET
                        fetch(`https://help-trading-production.up.railway.app/api/scan/${tokenMint}?lang=${currentLang}`, {
                            headers: { 
                                
                                "x-wallet-address": userWallet 
                            }
                        }).catch(() => {});
                    } else {
                        
                        // 👉 FETCH PRINCIPALE CON HEADER WALLET
                        fetch(`https://help-trading-production.up.railway.app/api/scan/${tokenMint}?lang=${currentLang}`, {
                            headers: { 
                                
                                "x-wallet-address": userWallet 
                            }
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
                            if (staticBox) staticBox.innerHTML = `<div style="color:#ff4d4d; padding:15px; border:1px solid #ff4d4d; background: rgba(255, 77, 77, 0.1); border-radius:8px; text-align:center;">⚠️ Error: ${err.message}</div>`;
                        });
                    }
                });
            });
        });
    }

    // =========================================================
    // 🎨 COSTRUZIONE INTERFACCIA
    // =========================================================
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
                    <span style="font-size: 0.75em; color: #b366ff; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">${t('copilot_title')}</span>
                    <button id="btn-copilot" style="background: #b366ff; color: #000; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75em; text-transform: uppercase;">${t('copilot_btn')}</button>
                </div>
                <div id="copilot-result" style="font-family: monospace; font-size: 0.85em; color: #ccc; display: none; border-top: 1px dashed #4a2b66; padding-top: 10px; margin-top: 10px;"></div>
            </div>`;

        const orderFlowHTML = `
            <div style="background: rgba(10, 12, 16, 0.9); padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #2d3142;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.75em; color: #888; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">${t('orderflow_title')}</span>
                    <span id="flow-percentage" style="color: #00ffcc; font-weight: bold; font-family: monospace;">${t('orderflow_waiting')}</span>
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
                    <span>${t('live_tape_title')}</span>
                    <span style="color: #00ffcc; font-size: 0.8em;">WSS Sync</span>
                </div>
                <div id="live-tape-list" style="display: flex; flex-direction: column; gap: 6px; height: 180px; overflow-y: auto; padding-right: 4px;">
                    <div style="text-align:center; color:#555; font-style:italic; font-size:0.8em; margin-top:20px;">${t('live_tape_listening')}</div>
                </div>
            </div>`;

        contentDiv.innerHTML = `
            <style>
                #scroll-area, #live-tape-list, #spy-feed-list { overflow-anchor: none !important; }
                @keyframes slideInLeft { 0% { transform: translateX(-100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
                @keyframes pulseGlow { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                @keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); } }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: transparent; } /* Sfondo trasparente: elimina la riga nera! */
                ::-webkit-scrollbar-thumb { background: #2d3142; border-radius: 3px; }
                .avatar-option { width: 36px; height: 36px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; opacity: 0.5; transition: 0.2s; object-fit: cover; }
                .avatar-option.active { border: 2px solid #00ffcc; opacity: 1; transform: scale(1.1); box-shadow: 0 0 10px rgba(0,255,204,0.4); }
                .lang-btn { flex: 1; border: 1px solid #444; border-radius: 4px; padding: 5px 2px; font-size: 0.75em; font-weight: bold; cursor: pointer; transition: 0.2s; }
                .select-modern { width: 100%; background: #0a0c10; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.75em; outline: none; cursor: pointer; }
                
                /* 🔥 FIX: Evita che le opzioni del menù a tendina siano invisibili o trasparenti */
                .select-modern option { background: #050608; color: #ffffff; font-family: Tahoma, sans-serif; font-weight: bold; }
            </style>
            
            <div style="width: 100%; display: flex; flex-direction: column; box-sizing: border-box;">
                <div id="hud-header" style="background: rgba(18, 21, 31, 0.95); backdrop-filter: blur(5px); border-bottom: 2px solid #444; padding: 12px; display: flex; flex-direction: column; flex-shrink: 0; z-index: 10;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div>
                            <div style="font-size: 0.6em; color: #888; text-transform: uppercase; letter-spacing: 1px;">Meme Saver</div>
                            <div style="font-size: 0.95em; font-weight: 900; color: #00ffcc;">Trading Terminal</div>
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
                                <h3 style="margin: 0; color: #fff; font-weight: 900; letter-spacing: 1px;">Control Room</h3>
                                <div style="color: #888; font-size: 0.65em; margin-top: 2px; text-transform: uppercase;">Algorithm Settings</div>
                            </div>
                        </div>

                        <!-- LANGUAGE SELECTOR -->
                        <div style="background: #161821; border: 1px solid #2d3142; border-radius: 8px; padding: 8px 12px; margin-bottom: 15px;">
                            <div style="font-size: 0.65em; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 6px; text-align: center;">Interface Language</div>
                            <div style="display: flex; justify-content: space-between; gap: 6px;">
    <button class="lang-btn" data-lang="en" style="background: ${currentLang === 'en' ? '#00ffcc' : '#0a0c10'}; color: ${currentLang === 'en' ? '#000' : '#fff'}; display: flex; align-items: center; justify-content: center; gap: 4px;">
        <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ec-1f1e7.svg" style="width: 14px; height: 14px; vertical-align: middle;"> EN
    </button>
    <button class="lang-btn" data-lang="it" style="background: ${currentLang === 'it' ? '#00ffcc' : '#0a0c10'}; color: ${currentLang === 'it' ? '#000' : '#fff'}; display: flex; align-items: center; justify-content: center; gap: 4px;">
        <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ee-1f1f9.svg" style="width: 14px; height: 14px; vertical-align: middle;"> IT
    </button>
    <button class="lang-btn" data-lang="zh" style="background: ${currentLang === 'zh' ? '#00ffcc' : '#0a0c10'}; color: ${currentLang === 'zh' ? '#000' : '#fff'}; display: flex; align-items: center; justify-content: center; gap: 4px;">
        <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1e8-1f1f3.svg" style="width: 14px; height: 14px; vertical-align: middle;"> 中文
    </button>
    <button class="lang-btn" data-lang="fr" style="background: ${currentLang === 'fr' ? '#00ffcc' : '#0a0c10'}; color: ${currentLang === 'fr' ? '#000' : '#fff'}; display: flex; align-items: center; justify-content: center; gap: 4px;">
        <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1eb-1f1f7.svg" style="width: 14px; height: 14px; vertical-align: middle;"> FR
    </button>
</div>
                        </div>

                        <!-- PRO PORTAL -->
                        <div style="background: linear-gradient(145deg, #0a0c10, #161821); border: 1px solid #00ffcc; border-radius: 8px; padding: 15px; margin-bottom: 15px; text-align: center; box-shadow: 0 4px 15px rgba(0, 255, 204, 0.05);">
                            <div style="width: 40px; height: 40px; margin: 0 auto 8px; background: rgba(0, 255, 204, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.3em; border: 1px solid rgba(0, 255, 204, 0.3);">💎</div>
                            <strong style="color: #00ffcc; font-size: 1.05em; text-transform: uppercase; letter-spacing: 1px;">Pro Account Hub</strong>
                            
                            <div style="background: #050608; border: 1px dashed #2d3142; border-radius: 6px; padding: 8px; margin: 10px 0; font-family: monospace; font-size: 0.8em; color: #aaa; text-align: left;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                    <span>Account Status:</span> 
                                    <span id="account-status-badge" style="color: #ffaa00; font-weight: bold;">Syncing...</span>
                                </div>
                            </div>
                            
                            <!-- CAMPO CHIAVE CON OCCHIO (SVG) -->
                            <div style="position: relative; margin-bottom: 12px;">
                                <input type="password" id="user-sync-key" placeholder="Paste Sync Key..." style="width: 100%; box-sizing: border-box; background: #0a0c10; border: 1px solid #444; color: #00ffcc; padding: 8px 35px 8px 8px; border-radius: 4px; font-family: monospace; font-size: 0.85em; text-align: center; outline: none; transition: 0.2s;">
                                
                                <div id="toggle-key-visibility" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #666; display: flex; align-items: center; justify-content: center; transition: 0.2s;" title="Mostra/Nascondi">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 8px;">
                                <!-- Bottone Sync (Visibile se disconnesso) -->
                                <button id="btn-save-sync" style="flex: 1; background: #1a1c29; color: #00ffcc; border: 1px solid #00ffcc; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75em; text-transform: uppercase; transition: 0.2s;">Sync</button>
                                
                                <!-- 🔥 NUOVO: Bottone Log Out (Visibile se connesso) -->
                                <button id="btn-logout-sync" style="display: none; flex: 1; background: #1a1c29; color: #ff4d4d; border: 1px solid #ff4d4d; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75em; text-transform: uppercase; transition: 0.2s;">Log Out</button>
                                
                                <a href="https://www.memesaver.lol/dashboard/wallet" target="_blank" style="flex: 1; background: #00ffcc; color: #000; border: none; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75em; text-transform: uppercase; text-decoration: none; display: flex; align-items: center; justify-content: center;">Upgrade</a>
                            </div>
                        </div>

                        <!-- AI SELECTOR -->
<div style="background: #11121a; border: 1px solid #2d3142; border-left: 3px solid #a855f7; border-radius: 8px; padding: 12px; margin-bottom: 15px; position: relative;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #a855f7; font-size: 0.8em; text-transform: uppercase; font-weight: 900;">🧠 AI Engine</strong>
        
        <!-- 🔥 ID CAMBIATO E TESTO FISSO -->
        <span id="ai-premium-badge" style="font-size: 0.65em; background: rgba(168, 85, 247, 0.1); padding: 3px 6px; border-radius: 4px; color: #c084fc; font-weight: bold; border: 1px solid #a855f7;">🔒 PREMIUM ONLY</span>
        
    </div>
    <select id="user-ai-model" disabled class="select-modern" style="cursor: not-allowed; transition: all 0.3s;">
        <option value="deepseek/deepseek-chat">DeepSeek V3 (Fast - Default)</option>
        <option value="openai/gpt-4o">GPT-4o (Institutional)</option>
        <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Analytical)</option>
    </select>
    <p id="ai-upgrade-text" style="color: #666; font-size: 0.65em; margin-top: 8px; margin-bottom: 0; line-height: 1.3;"><b>PREMIUM</b> plan exclusive. Unlock institutional models.</p>
</div>

                       <!-- TRADING ROUTE & RISK MANAGEMENT (COMING SOON) -->
                        <div style="margin-bottom: 15px; border: 1px dashed #a855f7; border-radius: 8px; padding: 12px; background: rgba(168, 85, 247, 0.05);">
                            
                            <!-- 🔥 BADGE HYPE "COMING SOON" CENTRATO -->
                            <div style="display: flex; justify-content: center; margin-bottom: 12px;">
                                <span style="background: linear-gradient(90deg, #ff007f, #a855f7); color: #fff; font-size: 0.65em; font-weight: 900; padding: 4px 12px; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 0 10px rgba(255,0,127,0.4);">
                                    🚧 V2: Auto-Trading Coming Soon
                                </span>
                            </div>
                            
                            <!-- Contenitore Opacizzato e Bloccato -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; opacity: 0.4; pointer-events: none; filter: grayscale(30%);">
                                
                                <div style="background: #161821; border: 1px solid #2d3142; border-top: 3px solid #4da6ff; border-radius: 6px; padding: 10px;">
                                    <strong style="color: #4da6ff; font-size: 0.7em; text-transform: uppercase;">🚀 Trading Route</strong>
                                    <select disabled id="user-route-mode" class="select-modern" style="margin-top: 6px; border: 1px solid #4da6ff; background: rgba(77, 166, 255, 0.05);">
                                        <option value="standard">Standard (Public)</option>
                                        <option value="mev_protect">MEV Shield</option>
                                        <option value="turbo">Turbo Node</option>
                                    </select>
                                </div>

                                <div style="background: #161821; border: 1px solid #2d3142; border-top: 3px solid #ffaa00; border-radius: 6px; padding: 10px;">
                                    <strong style="color: #ffaa00; font-size: 0.7em; text-transform: uppercase;">⚖️ Auto-Trade Risk</strong>
                                    <select disabled id="user-risk-profile" class="select-modern" style="margin-top: 6px; border: 1px solid #ffaa00; background: rgba(255, 170, 0, 0.05);">
                                        <option value="safe">Safe (Scalp +20%)</option>
                                        <option value="degen">Degen (Aim for 2x)</option>
                                        <option value="moon">Moonshot (Hold)</option>
                                    </select>
                                </div>
                                
                            </div>
                        </div>
                        <!-- SCAN HISTORY -->
                        <div style="background: #0a0c10; border: 1px solid #2d3142; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                            <strong style="color: #aaa; font-size: 0.7em; text-transform: uppercase; display: block; margin-bottom: 8px;">📚 Scan History</strong>
                            <div style="font-size: 0.75em; color: #666; font-family: monospace; line-height: 1.5;">
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #222; padding-bottom: 4px; margin-bottom: 4px;"><span>FUKg...9xK</span> <span style="color: #ff4d4d;">[AVOID]</span></div>
                                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #222; padding-bottom: 4px; margin-bottom: 4px;"><span>8mvf...Xwv</span> <span style="color: #00e676;">[RIDE]</span></div>
                                <div style="display: flex; justify-content: space-between;"><span>3Bkx...1oP</span> <span style="color: #ffaa00;">[SCALP]</span></div>
                            </div>
                        </div>

                        <!-- AVATAR SELECTION -->
                        <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #2d3142;">
                            <img class="avatar-option" data-src="${av1}" src="${av1}" title="Avatar 1">
                            <img class="avatar-option" data-src="${av2}" src="${av2}" title="Avatar 2">
                            <img class="avatar-option" data-src="${av3}" src="${av3}" title="Avatar 3">
                            <img class="avatar-option" data-src="${av4}" src="${av4}" title="Avatar 4">
                        </div>

                        <button id="btn-save-config" style="width: 100%; background: linear-gradient(90deg, #00ffcc, #00b38f); color: #000; border: none; padding: 10px; border-radius: 6px; font-weight: 900; font-size: 0.85em; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s; margin-bottom: 10px;">
                            Save Settings
                        </button>

                        <!-- DISCORD UNDERGROUND (PRO ONLY) -->
                        <a id="btn-discord" href="#" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box; background: #111; border: 1px dashed #5865F2; color: #5865F2; text-decoration: none; padding: 10px; border-radius: 6px; font-weight: bold; font-size: 0.8em; cursor: pointer; transition: 0.2s;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
                            <span id="discord-text">Join the Resistance</span>
                        </a>
                    </div>

                    <!-- TAB 1: RADAR -->
                    <div id="view-radar">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <div style="display: flex; align-items: center; gap: 8px; font-family: monospace; color: #00ffcc; font-size: 0.85em; background: #0a0c10; padding: 6px 10px; border-radius: 6px; border: 1px solid #1a1c29;">
                                <span>🎯 ${tokenMint.substring(0,12)}...</span>
                                <span id="mint-loading-status" style="color: #ffaa00; font-size: 0.85em; font-weight: bold; animation: pulseGlow 1.5s infinite;">Analyzing...</span>
                            </div>
                            <button id="btn-ricarica" style="background: #161821; border: 1px solid #2d3142; color: #00ffcc; font-weight: bold; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.7em; text-transform: uppercase;">Reload</button>
                        </div>
                        ${copilotHTML}
                        ${orderFlowHTML}
                        ${liveTapeHTML}
                        <div id="static-analysis-box"></div>
                    </div>

                    <!-- TAB 2: TRACKER -->
                    <div id="view-tracker" style="display: none;">
                        <div style="text-align: center; margin-bottom: 15px;"><h3 style="margin: 0; color: #00ffcc; font-weight: 900; letter-spacing: 1px;">Wallet Tracker</h3></div>
                        
                        <div style="display: flex; gap: 6px; margin-bottom: 15px; align-items: stretch;">
                            <input type="text" id="new-wallet-name" placeholder="Name" style="width: 30%; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid #2d3142; border-radius: 6px; color: white; outline: none; font-size: 0.7em;">
                            <input type="text" id="new-wallet-input" placeholder="Paste Wallet..." style="flex-grow: 1; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid #2d3142; border-radius: 6px; color: white; outline: none; font-size: 0.75em; font-family: monospace;">
                            <button id="add-wallet-btn" style="padding: 0 12px; background: #00ffcc; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.75em;">ADD</button>
                        </div>
                        
                        <div id="tracked-wallets-list" style="font-size: 11px;"></div>
                    </div>

                    <!-- TAB 3: SPY FEED -->
                    <div id="view-spy" style="display: none;">
                        <div style="text-align: center; margin-bottom: 15px;"><h3 style="margin: 0; color: #ff007f; font-weight: 900; letter-spacing: 1px;">Spy Radar</h3></div>
                        <div id="spy-feed-list" style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="text-align:center; color:#555; font-style:italic; padding: 20px; font-size:0.9em;">Waiting for whale transactions...</div>
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
    // 🌟 FUNZIONE MODAL PREMIUM (Sostituisce alert e confirm)
// =========================================================
// 🌟 FUNZIONE MODAL PREMIUM (Sostituisce alert e confirm)
// =========================================================
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
    // =========================================================
    // 🎛️ EVENTI BASE E TABS
    // =========================================================
    // =========================================================
    // 🎛️ EVENTI BASE E TABS
    // =========================================================
    // =========================================================
    // 🎛️ EVENTI BASE E TABS
    // =========================================================
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

        // ==========================================
        // 🔥 AUTO-SALVATAGGIO SKIN (AVATAR)
        // ==========================================
        const av1 = chrome.runtime.getURL("avatar1.png");
        let selectedAvatarUrl = av1; 

        const avatarOptions = document.querySelectorAll('.avatar-option');
        avatarOptions.forEach(img => {
            img.addEventListener('click', (e) => {
                avatarOptions.forEach(opt => opt.classList.remove('active')); 
                e.target.classList.add('active'); 
                selectedAvatarUrl = e.target.getAttribute('data-src');
                document.getElementById('current-user-avatar').src = selectedAvatarUrl; 
                
                // Salva istantaneamente l'avatar
                chrome.storage.local.get(['userConfig'], (configRes) => {
                    const newC = configRes.userConfig || {};
                    newC.avatarUrl = selectedAvatarUrl;
                    chrome.storage.local.set({ userConfig: newC });
                });
            });
        });

        // ==========================================
        // CARICAMENTO INIZIALE DELLA MEMORIA E IA
        // ==========================================
        chrome.storage.local.get(['userConfig', 'userAuthToken'], (res) => {
            if (res.userConfig) {
                // Carica i menù a tendina 
                if (document.getElementById('user-route-mode')) document.getElementById('user-route-mode').value = res.userConfig.routeMode || "standard";
                if (document.getElementById('user-risk-profile')) document.getElementById('user-risk-profile').value = res.userConfig.riskProfile || "safe";
                
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

            // LOGICA SBLOCCO IA PREMIUM E AUTO-SALVATAGGIO
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
            if (aiBadge) { // 🛡️ Protezione crash
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

        // =========================================================
        // 🔥 PULSANTE: SAVE SETTINGS
        // =========================================================
        const btnSaveConfig = document.getElementById('btn-save-config');
        if (btnSaveConfig) {
            btnSaveConfig.addEventListener('click', () => {
                const newConfig = {
                    avatarUrl: selectedAvatarUrl,
                    aiModel: document.getElementById('user-ai-model') ? document.getElementById('user-ai-model').value : "deepseek/deepseek-chat",
                    routeMode: document.getElementById('user-route-mode') ? document.getElementById('user-route-mode').value : "standard",
                    riskProfile: document.getElementById('user-risk-profile') ? document.getElementById('user-risk-profile').value : "safe"
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

        // =========================================================
        // 💎 LOGICA SALVATAGGIO, LOGOUT SYNC KEY E UPGRADE
        // =========================================================
        
        // 🚀 Tasto UPGRADE che porta al tuo sito
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
                    // È CONNESSO
                    if(document.getElementById('user-sync-key')) document.getElementById('user-sync-key').value = res.userAuthToken;
                    if(badge) {
                        badge.innerText = "CONNECTED ✅";
                        badge.style.color = "#00e676";
                    }
                    btnSaveSync.style.display = 'none'; // Nascondi Sync
                    if(btnLogoutSync) btnLogoutSync.style.display = 'block'; // Mostra Log Out
                } else {
                    // È FREE TIER
                    if(badge) {
                        badge.innerText = "FREE TIER 🆓";
                        badge.style.color = "#aaa";
                    }
                    btnSaveSync.style.display = 'block';
                    if(btnLogoutSync) btnLogoutSync.style.display = 'none';
                }
            });

            // LOGICA DI SALVATAGGIO CHIAVE (Usa il Modal Premium)
            btnSaveSync.addEventListener('click', () => {
                const keyInput = document.getElementById('user-sync-key');
                const key = keyInput ? keyInput.value.trim() : "";
                
                if (!key) {
                    showPremiumModal("Input Required", "Please paste a Sync Key before syncing!", false);
                    return;
                }

                // VALIDAZIONE DELLA CHIAVE
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

            // LOGICA LOGOUT (Usa il Modal Premium Interattivo)
            if (btnLogoutSync) {
                btnLogoutSync.addEventListener('click', () => {
                    showPremiumModal(
                        "Disconnect Account?", 
                        "Are you sure you want to remove your Sync Key? You will be reverted to the FREE plan and daily limits.", 
                        true, 
                        () => {
                            chrome.storage.local.remove('userAuthToken', () => {
                                console.log("Account scollegato!");
                                location.reload(); // Ricarica e torna free
                            });
                        }
                    );
                });
            }
        }
        
        // GESTIONE OCCHIOLINO PASSWORD
        const toggleVisibilityBtn = document.getElementById('toggle-key-visibility');
        const keyInput = document.getElementById('user-sync-key');
        
        if (toggleVisibilityBtn && keyInput) {
            toggleVisibilityBtn.addEventListener('click', () => {
                if (keyInput.type === 'password') {
                    keyInput.type = 'text'; // Mostra il testo
                    toggleVisibilityBtn.style.color = '#00ffcc'; // L'occhio si illumina
                } else {
                    keyInput.type = 'password'; // Nasconde il testo
                    toggleVisibilityBtn.style.color = '#666'; // L'occhio si spegne
                }
            });
        }
    
        // 🌍 4. CAMBIO LINGUA LIVE
        // 🌍 4. CAMBIO LINGUA LIVE (Fix Caricamento Infinito)
        const langBtns = document.querySelectorAll('.lang-btn');
        langBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newLang = e.currentTarget.getAttribute('data-lang');
                if (newLang !== currentLang) {
                    chrome.storage.local.set({ userLanguage: newLang }, () => {
                        // Invece di far incartare l'HTML, ricarichiamo il popup: tutto ripartirà a razzo nella nuova lingua!
                        location.reload(); 
                    });
                }
            });
        });

        // 5. ALTRI BOTTONI E SOCKETS (Radar base)
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

            // 🔥 1. LEGGIAMO LA MEMORIA PER CHIAVE E TARGA PRIMA DELLA FETCH
            // 🔥 1. LEGGIAMO LA MEMORIA PER CHIAVE E TARGA PRIMA DELLA FETCH
            chrome.storage.local.get(['userAuthToken', 'device_fingerprint'], async (res) => {
                // FORZA STRINGA E PULISCI GLI SPAZI INVISIBILI DI CHROME
                const authToken = res.userAuthToken ? String(res.userAuthToken).trim() : "null";
                const deviceId = res.device_fingerprint ? String(res.device_fingerprint).trim() : "null";
                const langParam = typeof currentLang !== 'undefined' ? currentLang : 'en';

                try {
                    const payloadDatiLive = window.liveMetrics || { buyVol: 0, sellVol: 0, buyPressure: 50 };
                    
                    // 🔥 2. FETCH AL SERVER CON HEADER DI SICUREZZA
                    const resp = await fetch(`https://help-trading-production.up.railway.app/api/copilot/${tokenMint}?lang=${langParam}`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json', 
                            
                            "x-auth-token": authToken,  // Manda la chiave al server!
                            "x-device-id": deviceId     // Manda la targa al server!
                        },
                        body: JSON.stringify(payloadDatiLive)
                    });
                    
                    const dataResp = await resp.json();
                    
                    // 🔥 3. CONTROLLO LIMITI: Il server dice che abbiamo finito i crediti?
                    // 🔥 3. CONTROLLO LIMITI: Il server dice che abbiamo finito i crediti?
                    // 🔥 3. CONTROLLO LIMITI: Il server dice che abbiamo finito i crediti o bloccato il device?
                    if (dataResp.success === false) {
                        
                        // 1. Creiamo il bottone UPGRADE *SOLO* se il server ce lo chiede
                        let actionButtonHtml = "";
                        if (dataResp.azione === "UPGRADE") {
                            actionButtonHtml = `
                                <a href="https://www.memesaver.lol/dashboard/pricing" target="_blank" style="display: block; text-align: center; padding: 8px; border: 1px solid #ffaa00; color: #000; background: linear-gradient(90deg, #ffaa00, #ff8800); font-weight: 900; border-radius: 6px; text-decoration: none; text-transform: uppercase; cursor: pointer; transition: 0.2s; box-shadow: 0 0 15px rgba(255, 170, 0, 0.4);">
                                    💎 UPGRADE NOW
                                </a>
                            `;
                        }

                        // 2. Stampiamo il messaggio (con o senza bottone a seconda del caso)
                        copilotResult.innerHTML = `
                            <div style="margin-bottom: 12px;">
                                <strong style="color:#ff4d4d;">${dataResp.tattica || "BLOCCO IA"}</strong><br>
                                <span style="color:#e0e0e0; font-size: 13px; display: inline-block; margin-top: 5px;">
                                    ${dataResp.puntoRottura || "Limite raggiunto"}
                                </span>
                            </div>
                            ${actionButtonHtml}
                        `;
                        
                        // Aggiorna il numerino in alto a destra a ZERO
                        const badge = document.getElementById('ai-lock-badge');
                        if (badge) {
                            badge.innerText = "🚫 LIMIT (0/5)";
                            badge.style.color = "#ff4d4d";
                            badge.style.border = "1px solid #ff4d4d";
                            badge.style.background = "rgba(255, 77, 77, 0.1)";
                        }
                        
                    } else {
                        // 🟢 4. SCANSIONE CONCLUSA: Il tuo codice originale per colorare l'azione
                        let tattica = traduciDalBackend(dataResp.tattica || "⚠️ Error AI");
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

                        // 🔥 AGGIORNA IL NUMERINO DEI CREDITI
                        const badge = document.getElementById('ai-lock-badge');
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
            }); // Fine chrome.storage.local.get
        });
    }

        // ======================= SOCKET.IO LOGIC =======================
        if (typeof socket !== 'undefined') {
            
            // Inizializza variabile per pulizia intelligente (anti-lag estremo)
            if (typeof window.tapePulito === 'undefined') window.tapePulito = false;

            socket.off('nuovo_trade_live');
            socket.on('nuovo_trade_live', (trade) => {
                resettaTimerNoia();
                
                // Sicurezza: convertiamo l'importo in numero per evitare errori
                const solAmount = parseFloat(trade.sol) || 0;
                
                // ==========================================
                // 1. ORDER FLOW (Matematica in background, calcola TUTTO senza laggare)
                // ==========================================
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

                // ==========================================
                // 🔔 2. ALLARME TRACKER WALLET
                // ==========================================
                if (window.activeTrackedWallets && window.activeTrackedWallets.length > 0) {
                    const walletTrovato = window.activeTrackedWallets.find(w => w.address === trade.wallet);
                    
                    if (walletTrovato && walletTrovato.notify !== false) {
                        const isAcquisto = trade.tipo.includes("BUY");
                        const azioneColor = isAcquisto ? "#00e676" : "#ff4d4d";
                        const azioneTesto = isAcquisto ? t('tracker_action_buy') : t('tracker_action_sell'); 
                        
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
                                <strong style="color:${azioneColor};">🎯 TRACKER: ${walletTrovato.name}</strong>
                                <span class="btn-chiudi-tracker" style="cursor:pointer; color:#888; font-size:1.2em; font-weight:bold;">✕</span>
                            </div>
                            <div style="font-size:0.9em; margin-bottom: 4px;"><b>${azioneTesto}</b></div>
                            <div style="color:#00ffcc; font-weight:bold;">Importo: ${solAmount.toFixed(2)} SOL</div>
                        `;
                        document.body.appendChild(notificaTracker);
                        
                        notificaTracker.querySelector('.btn-chiudi-tracker').addEventListener('click', () => {
                            notificaTracker.remove();
                        });
                        
                        setTimeout(() => { if (document.body.contains(notificaTracker)) notificaTracker.remove(); }, 7000);
                    }
                }

                // ==========================================
                // 🔴 3. LIVE TAPE VISIVO (Fix Anti-Freeze Estremo)
                // ==========================================
                const tapeList = document.getElementById('live-tape-list');
                if (tapeList) {
                    
                    // Pulizia iniziale intelligente (eseguita una sola volta, zero stress CPU)
                    if (!window.tapePulito) {
                        tapeList.innerHTML = '';
                        window.tapePulito = true;
                    }

                    // 🔥 FILTRO SALVAVITA: Stampa a schermo SOLO i trade umani (> 0.02 SOL)
                    if (solAmount > 0.02) {
                        const isBuy = trade.tipo.includes("BUY");
                        const color = isBuy ? "#00e676" : "#ff4d4d";
                        const el = document.createElement('div');
                        el.style.cssText = `font-family: monospace; font-size: 0.85em; color: ${color}; display: flex; justify-content: space-between; background: #161821; padding: 6px; border-radius: 4px; border-left: 3px solid ${color}; margin-bottom: 4px;`;
                        
                        el.innerHTML = `
                            <div style="display: flex; flex-direction: column; width: 100%;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                    <span style="font-weight: bold;">${trade.tipo} ${solAmount.toFixed(2)} SOL</span>
                                    <span title="${trade.zooTag}">${trade.zooIcon}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8em;">
                                    <span style="color:#aaa;">${trade.wallet.substring(0,4)}...${trade.wallet.slice(-4)}</span>
                                    <a href="${trade.solscan}" target="_blank" style="color: #4da6ff; text-decoration: none;">🔍 Solscan</a>
                                </div>
                            </div>`;
                        
                        tapeList.prepend(el);
                        
                        // Pulizia super-veloce della memoria (max 15 item visibili)
                        while (tapeList.children.length > 15) {
                            tapeList.removeChild(tapeList.lastChild);
                        }
                    }
                }
            });

            // ==========================================
            // 🚨 ALTRI EVENTI
            // ==========================================
            socket.off('spy_alert');
            socket.on('spy_alert', (data) => {
                const feed = document.getElementById('spy-feed-list');
                if (feed) {
                    if (feed.innerHTML.includes('attesa') || feed.innerHTML.includes('aiting') || feed.innerHTML.includes('等待')) feed.innerHTML = '';
                    
                    let msgTradotto = traduciDalBackend(data.messaggio);

                    const alertCard = document.createElement('div');
                    alertCard.style.cssText = "background: #330000; border: 1px solid #ff0000; padding: 8px; margin-bottom: 6px; border-radius: 4px; font-family: monospace;";
                    alertCard.innerHTML = `
                        <div style="color: #ff0000; font-weight: bold; font-size: 1.1em; border-bottom: 1px solid #ff4444; padding-bottom: 4px; margin-bottom: 6px;">
                            ${t('sybil_title')}
                        </div>
                        <div style="color: #e0e0e0; font-size: 0.9em; margin-bottom: 6px;">${msgTradotto}</div>
                    `;
                    feed.prepend(alertCard);
                    const tabSpy = document.getElementById('tab-spy');
                    if (tabSpy) { tabSpy.style.color = "#ff007f"; tabSpy.style.animation = "pulseRed 1s infinite"; }
                }
            });

            socket.off('autopsia_sniper_live');
            socket.on('autopsia_sniper_live', (data) => {
                aggiungiSpyCardHTML(data, true);
            });

        } // <-- QUESTA CHIUDE: if (typeof socket !== 'undefined')
    } // <-- QUESTA CHIUDE LA FUNZIONE PRINCIPALE (configuraEventiBase)
    // =========================================================
    // 📊 DATI STATICI E CARDS 
    // =========================================================
    // =========================================================
    // 📊 DATI STATICI E CARDS 
    // =========================================================
    function popolaInterfacciaStatica(data, tokenMint) {
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
            // 👉 PASSIAMO LE FRASI AL NOSTRO SUPER TRADUTTORE
            let devText = traduciDalBackend(data.advice.devStatus || "");
            let devColor = '#00ffcc'; 
            let devIcon = '👨‍💻';
            
            if (devText.toUpperCase().match(/GIOVAN|FRESH|GIORNI|DAYS|NEW/)) {
                devColor = '#ff4d4d'; 
                devIcon = '🚨';
                devText += ` <br><span style='color:#ff4d4d; font-size:0.85em; font-weight:bold;'>${t('high_risk_rug')}</span>`;
            } else if (devText.toUpperCase().match(/SERIAL|FARMER/)) {
                devColor = '#ffaa00'; 
                devIcon = '⚠️';
            }

            let bundleText = traduciDalBackend(data.advice.topHoldersStatus || "");
            let bundleColor = bundleText.match(/ATTENZIONE|RISCHIO|0%|RISK/) ? '#ffaa00' : '#00ffcc';
            
            if (bundleText.includes('0%')) {
                bundleColor = '#ffaa00'; 
                bundleText += ` <br><span style='color:#ffaa00; font-size:0.85em; font-weight:bold;'>${t('risk_bundle')}</span>`;
            }
            
            reportHTML += `
                <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 15px;">
                    <div style="background: linear-gradient(90deg, ${devColor}20, transparent); border-left: 4px solid ${devColor}; padding: 10px; border-radius: 4px; border: 1px solid #1a1c29;">
                        <div style="font-size: 0.7em; color: ${devColor}; text-transform: uppercase; font-weight: 900; margin-bottom: 4px; letter-spacing: 1px;">${devIcon} ${t('dev_history')}</div>
                        <div style="font-size: 0.85em; color: #e4e4e7; font-family: monospace;">${devText}</div>
                    </div>
                    <div style="background: linear-gradient(90deg, ${bundleColor}20, transparent); border-left: 4px solid ${bundleColor}; padding: 10px; border-radius: 4px; border: 1px solid #1a1c29;">
                        <div style="font-size: 0.7em; color: ${bundleColor}; text-transform: uppercase; font-weight: 900; margin-bottom: 4px; letter-spacing: 1px;">🛡️ ${t('supply_analysis')}</div>
                        <div style="font-size: 0.85em; color: #e4e4e7; font-family: monospace;">${bundleText}</div>
                    </div>
                </div>`;
        }
        staticBox.innerHTML = reportHTML;
    }
    // =========================================================
    // ⚖️ IL GIUDICE SUPREMO
    // =========================================================
    // =========================================================
    // ⚖️ IL GIUDICE SUPREMO (Con Controllo PRO)
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
                <span style="font-size: 0.75em; color: #c084fc; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">⚖️ ${t('judge_title')}</span>
                <span id="judge-timer" style="background:#4a2b66; color:#fff; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.8em; font-weight:bold;">0.0s</span>
            </div>
            <div style="text-align: center; padding: 10px; color: #c084fc;">
                <span style="animation: pulseGlow 1.5s infinite; font-weight:bold;">${t('judge_load1')}</span>
                <div style="font-size: 0.75em; color: #888; margin-top: 6px;">${t('judge_load2')}</div>
            </div>
        `;

        let sec = 0;
        const timerInterval = setInterval(() => {
            sec += 0.1;
            const timerEl = document.getElementById('judge-timer');
            if(timerEl) timerEl.innerText = sec.toFixed(1) + 's';
        }, 100);

        try {
            // 🔑 RECUPERA CONFIGURAZIONI, CHIAVE E TARGA
            // 🔑 RECUPERA CONFIGURAZIONI, CHIAVE E TARGA
            const storageRes = await chrome.storage.local.get(['userAuthToken', 'device_fingerprint', 'userConfig']);
            
            // FORZA STRINGA E PULISCI
            const authToken = storageRes.userAuthToken ? String(storageRes.userAuthToken).trim() : "null";
            const deviceId = storageRes.device_fingerprint ? String(storageRes.device_fingerprint).trim() : "null";
            const requestedAi = storageRes.userConfig?.aiModel || "deepseek/deepseek-chat";

            // 🔥 CHIAMATA AL SERVER PER IL GIUDICE
            const response = await fetch(`https://help-trading-production.up.railway.app/api/laboratorio/${tokenMint}?lang=${currentLang}`, {
                headers: { 
                    
                    "x-auth-token": authToken, 
                    "x-device-id": deviceId,
                    "x-ai-model": requestedAi 
                }
            });
            
            const data = await response.json();
            
            clearInterval(timerInterval); // Ferma il cronometro

            if (data.success) {
                // 🟢 SCANSIONE ANDATA A BUON FINE (Crediti sufficienti)
                container.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 0.75em; color: #c084fc; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">⚖️ ${t('judge_title')}</span>
                        <div style="display:flex; gap: 6px; align-items:center;">
                            <span style="color:#888; font-family:monospace; font-size:0.7em;">${t('done_in')} ${sec.toFixed(1)}s</span>
                            <button id="btn-refresh-judge" style="background: #c084fc; color: #000; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.7em;">🔄</button>
                        </div>
                    </div>
                    ${traduciDalBackend(data.verdetto)}
                `;
                document.getElementById('btn-refresh-judge').addEventListener('click', () => avviaLaboratorioGemini(tokenMint));

                const mintStatus = document.getElementById('mint-loading-status');
                if (mintStatus) mintStatus.innerHTML = t('loading_complete');

                // 🔥 AGGIORNAMENTO DEL NUMERINO DEI CREDITI NELLA UI
                const badge = document.getElementById('ai-lock-badge');
                if (badge) {
                    if (data.plan === 'free') {
                        badge.innerText = `🆓 FREE (${data.scansLeft}/5)`;
                        badge.style.color = "#fff";
                        badge.style.background = "#222";
                        badge.style.border = "1px solid #444";
                    } else if (data.plan === 'premium' || data.plan === 'pro' || data.plan === 'admin') {
                        badge.innerText = "💎 UNLIMITED";
                    }
                }

            } else if (data.limitReached || data.success === false) {
                // 🟡 CREDITI FINITI O ACCESSO NEGATO: MOSTRA IL BANNER D'ORO PER IL PASSAGGIO A PRO
                container.innerHTML = data.verdetto; // 🔥 Qui stampa il riquadro d'oro che arriva da Node.js!

                // AGGIORNA IL BADGE A ZERO
                const badge = document.getElementById('ai-lock-badge');
                if (badge) {
                    badge.innerText = "🚫 LIMIT (0/5)";
                    badge.style.color = "#ff4d4d";
                    badge.style.border = "1px solid #ff4d4d";
                    badge.style.background = "rgba(255, 77, 77, 0.1)";
                }
            } else {
                // 🔴 ERRORE GENERICO DELL'IA O DI RETE
                container.innerHTML = `<div style="color:#ff4d4d; padding:10px;">⚠️ Error AI: ${data.verdetto || "Errore Sconosciuto"}</div>`;
            }
        } catch (error) {
            clearInterval(timerInterval);
            container.innerHTML = `<div style="color:#ff4d4d; padding:10px;">❌ Connection error.</div>`;
        }
    }

    // =========================================================
    // 💼 LOGICA SMART MONEY TRACKER E SPY
    // =========================================================
    // =========================================================
    // 💼 LOGICA TRACKER WALLET (Con Nomi e Notifiche)
    // =========================================================
    
    // Variabile globale per far leggere i wallet allo scanner live
    window.activeTrackedWallets = [];

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
                
                // Conversione vecchio formato (se avevi salvato solo stringhe in passato)
                wallets = wallets.map(w => typeof w === 'string' ? { address: w, name: "Sconosciuto" } : w);
                
                // Evita i doppioni
                if (!wallets.find(w => w.address === address)) {
                    wallets.push({ address: address, name: name });
                    chrome.storage.local.set({ trackedWallets: wallets }, () => {
                        addressInput.value = '';
                        if(nameInput) nameInput.value = '';
                        loadSavedWallets(); // Ricarica la lista aggiornata
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
            
            // Aggiorna la memoria live per le notifiche
            window.activeTrackedWallets = wallets.map(w => typeof w === 'string' ? { address: w, name: "Unknown" } : w); // Fix: Da Sconosciuto a Unknown
            
            list.innerHTML = '';
            
            if (window.activeTrackedWallets.length === 0) {
                // 🔥 FIX: Rimuoviamo l'italiano dal Tracker
                list.innerHTML = `<div style="text-align:center; color:#888; padding: 10px; font-style: italic;">No wallets tracked.</div>`;
                return;
            }

            // ...il resto del codice continua qui...

            window.activeTrackedWallets.forEach((walletData, index) => {
                const div = document.createElement('div');
                div.style.cssText = "display:flex; justify-content:space-between; align-items:center; background: rgba(0,0,0,0.3); padding: 8px; border: 1px solid #2d3142; border-radius: 6px; margin-bottom: 6px;";
                
                // Disegna la campanellina (accesa o spenta)
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

            // 🔔 LOGICA ACCENDI/SPEGNI CAMPANELLINA
            document.querySelectorAll('.btn-notify-wallet').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = e.currentTarget.getAttribute('data-idx');
                    // Se era false diventa true, altrimenti diventa false
                    window.activeTrackedWallets[idx].notify = window.activeTrackedWallets[idx].notify === false ? true : false;
                    chrome.storage.local.set({ trackedWallets: window.activeTrackedWallets }, loadSavedWallets);
                });
            });

            // 🔥 LOGICA ELIMINAZIONE INTUITIVA
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

    // 🎨 GENERATORE E INSERITORE UNIVERSALE SPY CARD (Compatto + Tradotto + Copia)
function aggiungiSpyCardHTML(data, isNew) {
    const feed = document.getElementById('spy-feed-list');
    if (!feed) return;
    if (feed.innerHTML.includes('attesa') || feed.innerHTML.includes('aiting') || feed.innerHTML.includes('等待') || feed.innerHTML.includes('Écoute')) {
        feed.innerHTML = '';
    }

    // 1. UNIFICA I DATI (Accetta sia il formato dello Storico che quello della Diretta)
    let esitoGrezzo = data.esito || (data.type === "BUY" ? "🟢 BOUGHT" : "🔴 SOLD");
    let motivoGrezzo = data.motivo || (data.stats ? data.stats.classificazione : "");
    if (data.strategy && data.solSpent) motivoGrezzo += ` - Investment: ${data.solSpent.toFixed(2)} SOL`;
    else if (!data.esito && data.type !== "BUY") motivoGrezzo = "Exiting position";

    // 2. TRADUCE TUTTO IN INGLESE (O nella lingua scelta)
    let translatedEsito = traduciDalBackend(esitoGrezzo);
    let translatedMotivo = traduciDalBackend(motivoGrezzo);
    
    // 3. VARIABILI GRAFICHE E ORARIO
    let color = data.colore || (data.strategy ? data.strategy.color : (data.type === "BUY" ? "#00ffcc" : "#ff4d4d"));
    let timeText = data.orario || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let wallet = data.walletSpia || data.walletName || "Unknown";
    let mint = data.mint || "";

    // 4. CREAZIONE CARD ULTRA-COMPATTA CON TASTO COPIA
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
    
    // 5. INSERIMENTO INTELLIGENTE
    if (isNew) {
        feed.prepend(card);
        if (feed.children.length > 20) feed.removeChild(feed.lastChild);
    } else {
        feed.appendChild(card);
    }

    // 6. LOGICA DEL PULSANTE COPIA
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
                    const response = await fetch(`https://help-trading-production.up.railway.app/api/spy-wallet/${wallet}`, {
                     
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
                // 🔥 FIX: Testo tradotto dinamicamente tramite il motore i18n
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