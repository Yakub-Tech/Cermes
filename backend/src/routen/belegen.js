import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';
import { kaertchenFuerAusgabe, nachArtikelUndNummerAufsteigend } from '../kaertchenListen.js';
import { protokolliere } from '../audit.js';
import { versucheStatusWechsel } from '../kaertchenStatusWechsel.js';

const router = express.Router();

const erlaubteWechsel = [
  ['in_bearbeitung', 'abholbereit'],
  ['abholbereit', 'in_bearbeitung'],
];

function stornierteFuerKueche(db) {
  const zeilen = db.prepare(
    `SELECT id, nummer, artikel_name, artikel_name_tr, beilagen, beilagen_tr, sonderwunsch
     FROM kaertchen WHERE storno_kueche_offen = 1 ORDER BY storniert_am, id`
  ).all();
  return zeilen.map((zeile) => ({
    ...zeile, beilagen: JSON.parse(zeile.beilagen), beilagen_tr: JSON.parse(zeile.beilagen_tr),
  }));
}

router.get('/api/belegen/kaertchen', brauchtRolle('belegen'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  antwort.json({
    in_bearbeitung: kaertchenFuerAusgabe(db, 'in_bearbeitung').sort(nachArtikelUndNummerAufsteigend),
    abholbereit: kaertchenFuerAusgabe(db, 'abholbereit').sort(nachArtikelUndNummerAufsteigend),
    storniert: stornierteFuerKueche(db),
  });
});

router.post('/api/belegen/status/:id', brauchtRolle('belegen'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const neuerStatus = anfrage.body.status;
  const kaertchen = db.prepare('SELECT * FROM kaertchen WHERE id = ?').get(anfrage.params.id);
  if (!kaertchen) {
    return antwort.status(404).json({ fehler: 'Dieses Kärtchen gibt es nicht.' });
  }
  try {
    if (!versucheStatusWechsel(db, anfrage.benutzer, kaertchen, neuerStatus, erlaubteWechsel)) {
      return antwort.status(409).json({ fehler: 'Das Kärtchen wurde inzwischen anderweitig geändert.' });
    }
  } catch {
    return antwort.status(500).json({ fehler: 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.' });
  }
  sendeEreignis('kaertchen');
  antwort.json({ ok: true });
});

router.post('/api/belegen/storno-quittieren/:id', brauchtRolle('belegen'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const kaertchen = db.prepare('SELECT * FROM kaertchen WHERE id = ?').get(anfrage.params.id);
  if (!kaertchen) {
    return antwort.status(404).json({ fehler: 'Dieses Kärtchen gibt es nicht.' });
  }
  try {
    db.transaction(() => {
      const ergebnis = db.prepare(
        'UPDATE kaertchen SET storno_kueche_offen = 0 WHERE id = ? AND storno_kueche_offen = 1'
      ).run(kaertchen.id);
      if (ergebnis.changes === 0) return;
      protokolliere(db, anfrage.benutzer, 'storno', 'storno_quittiert', {
        werte: { nummer: kaertchen.nummer, artikel: kaertchen.artikel_name },
      });
    })();
  } catch {
    return antwort.status(500).json({ fehler: 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.' });
  }
  sendeEreignis('kaertchen');
  antwort.json({ ok: true });
});

export default router;
