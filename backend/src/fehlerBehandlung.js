const UNERWARTETER_FEHLER = 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.';

export function fehlerBehandlung(fehler, anfrage, antwort, weiter) {
  if (antwort.headersSent) {
    return weiter(fehler);
  }
  if (fehler.type === 'entity.parse.failed') {
    return antwort.status(400).json({
      fehler: 'Die Anfrage konnte nicht gelesen werden. Bitte die Seite neu laden und es noch einmal versuchen.',
    });
  }
  if (fehler.type === 'entity.too.large') {
    return antwort.status(413).json({ fehler: 'Die gesendeten Daten sind zu groß und wurden abgelehnt.' });
  }
  if (fehler.status >= 400 && fehler.status < 500) {
    return antwort.status(fehler.status).json({ fehler: 'Die Anfrage konnte nicht verarbeitet werden.' });
  }
  console.error(`Unerwarteter Fehler bei ${anfrage.method} ${anfrage.path}:`, fehler);
  antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
}
