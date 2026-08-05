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

            contentDiv.innerHTML = `<div style="padding: 10px;">Target: ${tokenMint}<br>⏳ Scansione on-chain...</div>`;

            const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${tokenMint}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const score = data.score || 0;
            const rischio = data.rischio || "N/A";
            const colorClass = score >= 50 ? '#ff4444' : '#00cc66';

            let logHTML = "";
            if (data.dettagli && data.dettagli.length > 0) {
                logHTML = "<div style='display: flex; flex-direction: column; gap: 6px; font-size: 0.85em;'>" + 
                          data.dettagli.map(log => {
                              let bColor = log.includes('✅') ? '#00cc66' : log.includes('🛑') ? '#ff4444' : '#00aaff';
                              return `<div style="background:#1a1a24; padding:8px; border-radius: 4px; border-left:3px solid ${bColor};">${log}</div>`;
                          }).join("") + "</div>";
            }

            // UNISCO IL RADAR E IL TRACKER IN UN UNICO INSERIMENTO CON LARGHEZZA FISSA 320PX
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

                    <div style="background:#111; padding:10px; border-radius: 6px; border:1px solid #333; margin-bottom: 15px;">
                        ${logHTML}
                    </div>

                    <!-- SEZIONE SMART MONEY TRACKER INCORPORATA -->
                    <div style="border-top: 1px solid #444; padding-top: 15px;">
                        <h4 style="margin: 0 0 12px 0; color: #00ffcc; font-size: 1.1em;">💼 Wallet Tracker</h4>
                        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                            <input type="text" id="new-wallet-input" placeholder="Incolla wallet..." style="width: 70%; padding: 8px; background: #222; border: 1px solid #444; border-radius: 4px; color: white; outline: none; box-sizing: border-box;">
                            <button id="add-wallet-btn" style="width: 30%; padding: 8px; background: #00ffcc; color: black; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; box-sizing: border-box;">Salva</button>
                        </div>
                        <div id="tracked-wallets-list" style="font-size: 11px; max-height: 180px; overflow-y: auto; padding-right: 4px;"></div>
                    </div>
                </div>
            `;

            // ATTIVA GLI EVENTI DEL TRACKER
            inizializzaTracker();

        } catch (error) {
            contentDiv.innerHTML = `<div style="width: 320px; color: #ffaa00; padding: 10px;">⚠️ Errore API: ${error.message}</div>`;
        }
    });

    // --- FUNZIONI DEL TRACKER ---
    function inizializzaTracker() {
        const addBtn = contentDiv.querySelector('#add-wallet-btn');
        const inputField = contentDiv.querySelector('#new-wallet-input');
        
        if (!addBtn || !inputField) {
            console.warn("Elementi del tracker non pronti nel DOM.");
            return;
        }
        
        addBtn.addEventListener('click', () => {
            const newWallet = inputField.value.trim();
            if (newWallet.length > 30) { 
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
            }
        });
        loadSavedWallets();
    }

    function loadSavedWallets() {
        const listContainer = contentDiv.querySelector('#tracked-wallets-list');
        if (!listContainer) return; 

        chrome.storage.local.get(['trackedWallets'], function(result) {
            const wallets = result.trackedWallets || [];
            listContainer.innerHTML = ''; 

            wallets.forEach(async (wallet) => {
                const walletItem = document.createElement('div');
                walletItem.style.cssText = "background: #1e1e24; border: 1px solid #333; border-radius: 4px; padding: 10px; margin-bottom: 8px;";
                walletItem.innerHTML = `<span style="color:#00ffcc;">⏳ Fetch ${wallet.substring(0, 6)}...</span>`;
                listContainer.appendChild(walletItem);

                try {
                    const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/tracker/${wallet}`, {
                        headers: { "ngrok-skip-browser-warning": "true" }
                    });
                    const data = await response.json();
                    
                    const pnlVal = parseFloat(data.pnlOggi);
                    const pnlColor = pnlVal >= 0 ? '#00ff00' : '#ff4444';
                    
                    walletItem.innerHTML = `
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #444; padding-bottom:4px;">
                            <strong style="color:#00aaff;">${wallet.substring(0, 6)}...${wallet.slice(-4)}</strong>
                            <span style="color:#888;">${data.classificazione || 'Tracker'}</span>
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
                    walletItem.innerHTML = `<span style="color:#ff4444;">❌ Timeout ${wallet.substring(0, 4)}...</span>`;
                }
            });
        });
    }
});