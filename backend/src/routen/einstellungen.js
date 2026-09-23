import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtAnmeldung, brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';
import { protokolliereAenderung, unterschiede } from '../audit.js';

const router = express.Router();

const UNERWARTETER_FEHLER = 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.';

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
  const vorher = alleEinstellungen(db);

  let neuerWarnwert = vorher.abholbereit_warnminuten;
  if (koerper.abholbereit_warnminuten !== undefined) {
    neuerWarnwert = Number(koerper.abholbereit_warnminuten);
    if (!Number.isInteger(neuerWarnwert) || neuerWarnwert < 0) {
      return antwort.status(400).json({ fehler: 'Die Warnzeit muss eine ganze Zahl ab 0 Minuten sein.' });
    }
  }
  let neueAbmeldezeit = vorher.inaktivitaets_abmeldung_minuten;
  if (koerper.inaktivitaets_abmeldung_minuten !== undefined) {
    neueAbmeldezeit = Number(koerper.inaktivitaets_abmeldung_minuten);
    if (!Number.isInteger(neueAbmeldezeit) || neueAbmeldezeit < 1) {
      return antwort.status(400).json({ fehler: 'Die Zeit bis zur automatischen Abmeldung muss eine ganze Zahl ab 1 Minute sein.' });
    }
  }

  try {
    const speichern = db.transaction(() => {
      db.prepare("UPDATE einstellung SET wert = ? WHERE schluessel = 'abholbereit_warnminuten'")
        .run(String(neuerWarnwert));
      db.prepare("UPDATE einstellung SET wert = ? WHERE schluessel = 'inaktivitaets_abmeldung_minuten'")
        .run(String(neueAbmeldezeit));
      protokolliereAenderung(db, anfrage.benutzer, 'einstellungen', 'einstellungen', {},
        unterschiede(vorher, { abholbereit_warnminuten: neuerWarnwert, inaktivitaets_abmeldung_minuten: neueAbmeldezeit },
          ['abholbereit_warnminuten', 'inaktivitaets_abmeldung_minuten']));
    });
    speichern();
    sendeEreignis('einstellungen');
    antwort.json(alleEinstellungen(db));
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

export default router;
