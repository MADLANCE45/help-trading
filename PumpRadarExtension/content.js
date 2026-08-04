// Funzione per estrarre l'indirizzo del token dall'URL di Pump.fun
function getTokenFromURL() {
    const path = window.location.pathname;
    const parts = path.split('/');
    const possibleToken = parts[parts.length - 1];
    
    if (possibleToken && possibleToken.endsWith('pump')) {
        return possibleToken;
    }
    return null;
}

// 🛡️ Creazione del widget in una bolla protetta (Shadow DOM)
function createRadarWidget() {
    // 1. Creiamo un contenitore invisibile e lo attacchiamo FUORI dal body dell'app React
    const host = document.createElement('div');
    host.id = 'pump-radar-host';
    host.style.cssText = 'position: fixed; bottom: 30px; right: 30px; z-index: 2147483647; pointer-events: none;';
    document.documentElement.appendChild(host);

    // 2. Creiamo lo Shadow DOM (la nostra bolla impenetrabile)
    const shadow = host.attachShadow({ mode: 'open' });

    // 3. Creiamo il vero widget dentro la bolla
    const widget = document.createElement('div');
    widget.style.cssText = `
        pointer-events: auto;
        background-color: #121212;
        color: #ffffff;
        padding: 16px;
        border-radius: 12px;
        border: 2px solid #555;
        font-family: 'Courier New', Courier, monospace;
        font-size: 14px;
        min-width: 260px;
        box-shadow: 0 10px 30px rgba(0,0,0,1);
        margin: 0;
        line-height: 1.4;
    `;
    widget.innerHTML = '<span style="font-size: 16px;">🕵️</span> Radar in scansione...';
    
    shadow.appendChild(widget);
    
    return widget; // Restituiamo il widget per aggiornarlo dopo
}

async function initRadar() {
    const tokenMint = getTokenFromURL();
    
    if (!tokenMint) {
        return; 
    }

    const widget = createRadarWidget();

    try {
        const response = await fetch(`http://localhost:3000/api/scan/${tokenMint}`);
        const data = await response.json();

        if (data.error) {
            widget.innerHTML = `❌ Errore: ${data.error}`;
            widget.style.borderColor = '#ff4444';
            return;
        }

        const borderColor = data.score >= 50 ? '#ff4444' : '#00C851';
        widget.style.borderColor = borderColor;

        widget.innerHTML = `
            <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #333; font-weight: bold; font-size: 16px;">
                Radar Report
            </div>
            <div style="margin-bottom: 6px;"><strong>Status:</strong> <span style="color: ${borderColor}">${data.rischio}</span></div>
            <div style="margin-bottom: 6px;"><strong>Rischio:</strong> ${data.score}/100</div>
            <div><strong>Dumper:</strong> ${data.dumperTrovati}</div>
        `;

    } catch (error) {
        widget.innerHTML = "⚠️ Nessuna connessione col server locale.";
        widget.style.borderColor = '#ffaa00';
    }
}

setTimeout(initRadar, 2500);