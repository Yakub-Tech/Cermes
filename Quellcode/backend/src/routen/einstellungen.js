import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtAnmeldung, brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';

const router = express.Router();

function alleEinstellungen(db) {
  const zeilen = db.prepare('SELECT schluessel, wert FROM einstellung').all();
  const werte = Object.fromEntries(zeilen.map((z) => [z.schluessel, Number(z.wert)]));
  return {
    abholbereit_warnminuten: werte.abholbereit_warnminuten,
    inaktivitaets_abmeldung_minuten: werte.inaktivitaets_abmeldung_minuten,
  };
}

router.get('/api/einstellungen', brauchtAnmeldung(), (_anfrage, antwort) => {
  antwort.json(alleEinstellungen(oeffneDatenbank()));
});

router.put('/api/einstellungen', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const koerper = anfrage.body;

  if (koerper.abholbereit_warnminuten !== undefined) {
    const minuten = Number(koerper.abholbereit_warnminuten);
    if (!Number.isInteger(minuten) || minuten < 0) {
      return antwort.status(400).json({ fehler: 'Die Warnzeit muss eine ganze Zahl ab 0 Minuten sein.' });
    }
    db.prepare("UPDATE einstellung SET wert = ? WHERE schluessel = 'abholbereit_warnminuten'")
      .run(String(minuten));
  }

  if (koerper.inaktivitaets_abmeldung_minuten !== undefined) {
    const minuten = Number(koerper.inaktivitaets_abmeldung_minuten);
    if (!Number.isInteger(minuten) || minuten < 1) {
      return antwort.status(400).json({ fehler: 'Die Zeit bis zur automatischen Abmeldung muss eine ganze Zahl ab 1 Minute sein.' });
    }
    db.prepare("UPDATE einstellung SET wert = ? WHERE schluessel = 'inaktivitaets_abmeldung_minuten'")
      .run(String(minuten));
  }

  sendeEreignis('einstellungen');
  antwort.json(alleEinstellungen(db));
});

export default router;
