// 1. Appena l'estensione si avvia, crea un timer
chrome.runtime.onInstalled.addListener(() => {
    // Controlla silenziosamente se ci sono aggiornamenti ogni 60 minuti
    chrome.alarms.create("checkUpdateAlarm", { periodInMinutes: 60 });
});

// 2. Quando il timer scatta, bussa ai server di Google
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkUpdateAlarm") {
        chrome.runtime.requestUpdateCheck((status) => {
            if (status === "update_available") {
                console.log("Nuova versione trovata sul Web Store! Download in corso...");
            }
        });
    }
});

// 3. IL GRILLETTO: Appena Google ha finito di scaricare il nuovo pacchetto in background...
chrome.runtime.onUpdateAvailable.addListener((details) => {
    console.log("Forzo l'aggiornamento alla versione " + details.version);
    // Questo comando ricarica l'estensione applicando il nuovo codice all'istante,
    // senza aspettare che l'utente riavvii il computer o chiuda Chrome.
    // I dati salvati in chrome.storage NON verranno toccati.
    chrome.runtime.reload();
});