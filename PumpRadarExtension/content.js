// Variabili globali per tenere traccia dello stato
let currentToken = null;
let radarHost = null;

// Funzione per estrarre l'indirizzo del token dall'URL
function getTokenFromURL() {
    const path = window.location.pathname;
    const parts = path.split('/');
    const possibleToken = parts[parts.length - 1];
    
    if (possibleToken && possibleToken.endsWith('pump')) {
        return possibleToken;
    }
    return null;
}

// 🛡️ Creazione del widget
function createRadarWidget() {
    // Se c'è già un vecchio widget, lo rimuoviamo per non crearne due
    if (radarHost) {
        radarHost.remove();
    }

    radarHost = document.createElement('div');
    radarHost.id = 'pump-radar-host';
    radarHost.style.cssText = 'position: fixed; bottom: 30px; right: 30px; z-index: 2147483647; pointer-events: none;';
    document.documentElement.appendChild(radarHost);

    const shadow = radarHost.attachShadow({ mode: 'open' });

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
    
    return widget; 
}

// Funzione principale di analisi
async function initRadar(tokenMint) {
    const widget = createRadarWidget();

   try {
        // RIGA MODIFICATA: Inserito il tuo VERO indirizzo Ngrok e l'header per il lasciapassare
        const response = await fetch(`https://tricking-judiciary-footwear.ngrok-free.dev/api/scan/${tokenMint}`, {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        });
        const data = await response.json();

        if (data.error) {
            widget.innerHTML = `❌ Errore: ${data.error}`;
            widget.style.borderColor = '#ff4444';
            return;
        }

        // Se non abbiamo ancora integrato questi dati nel backend, usiamo un fallback
        const score = data.score || 0;
        const rischio = data.rischio || "Analisi completata";
        const dumper = data.dumperTrovati || "N/A";

        const borderColor = score >= 50 ? '#ff4444' : '#00C851';
        widget.style.borderColor = borderColor;

        widget.innerHTML = `
            <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #333; font-weight: bold; font-size: 16px;">
                Radar Report
            </div>
            <div style="margin-bottom: 6px;"><strong>Status:</strong> <span style="color: ${borderColor}">${rischio}</span></div>
            <div style="margin-bottom: 6px;"><strong>Rischio:</strong> ${score}/100</div>
            <div><strong>Dumper:</strong> ${dumper}</div>
        `;

    } catch (error) {
        widget.innerHTML = "⚠️ Nessuna connessione col server locale.";
        widget.style.borderColor = '#ffaa00';
    }
}

// 🔄 IL SEGUGIO: Controlla se cambiamo pagina
function monitorURL() {
    const tokenMint = getTokenFromURL();
    
    // Se siamo su un nuovo token
    if (tokenMint && tokenMint !== currentToken) {
        currentToken = tokenMint;
        initRadar(tokenMint);
    } 
    // Se siamo tornati alla home (non c'è più il token)
    else if (!tokenMint && currentToken) {
        currentToken = null;
        if (radarHost) {
            radarHost.remove();
            radarHost = null;
        }
    }
}

// Avvia il segugio: controlla l'URL ogni 1 secondo (1000 millisecondi)
setInterval(monitorURL, 1000);