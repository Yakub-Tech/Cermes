import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';
import { protokolliere } from '../audit.js';

const router = express.Router();

const UNERWARTETER_FEHLER = 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.';

router.put('/api/artikel/:id/ausverkauft', brauchtRolle(['admin', 'verwaltung', 'kasse']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const ausverkauft = anfrage.body.ausverkauft;
  if (ausverkauft !== 0 && ausverkauft !== 1) {
    return antwort.status(400).json({ fehler: 'Bitte ausverkauft oder verfügbar angeben.' });
  }
  try {
    const umschalten = db.transaction(() => {
      const artikel = db.prepare('SELECT * FROM artikel WHERE id = ? AND geloescht = 0').get(anfrage.params.id);
      if (!artikel) return false;
      if (artikel.ausverkauft === ausverkauft) return true;
      db.prepare('UPDATE artikel SET ausverkauft = ? WHERE id = ?').run(ausverkauft, artikel.id);
      const aktion = ausverkauft ? 'artikel_ausverkauft_gesetzt' : 'artikel_ausverkauft_aufgehoben';
      protokolliere(db, anfrage.benutzer, 'artikel', aktion, { werte: { artikel: artikel.name } });
      return true;
    });
    if (!umschalten()) {
      return antwort.status(404).json({ fehler: 'Dieser Artikel existiert nicht mehr.' });
    }
    sendeEreignis('artikel');
    antwort.json({ id: Number(anfrage.params.id), ausverkauft });
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

export default router;
