import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';
import { kaertchenFuerAusgabe, nachArtikelUndNummerAufsteigend } from '../kaertchenListen.js';
import { versucheStatusWechsel } from '../kaertchenStatusWechsel.js';

const router = express.Router();

const erlaubteWechsel = [
  ['in_bearbeitung', 'abholbereit'],
  ['abholbereit', 'in_bearbeitung'],
];

router.get('/api/belegen/kaertchen', brauchtRolle('belegen'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  antwort.json({
    in_bearbeitung: kaertchenFuerAusgabe(db, 'in_bearbeitung').sort(nachArtikelUndNummerAufsteigend),
    abholbereit: kaertchenFuerAusgabe(db, 'abholbereit').sort(nachArtikelUndNummerAufsteigend),
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

router.get('/api/belegen/beilagen-uebersicht', brauchtRolle('belegen'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const artikelListe = db.prepare(
    'SELECT id, name FROM artikel WHERE aktiv = 1 AND geloescht = 0 ORDER BY sortierung, name'
  ).all();
  const uebersicht = artikelListe.map((artikel) => ({
    artikel_name: artikel.name,
    beilagen: db.prepare(
      `SELECT b.name FROM beilage b
       JOIN artikel_beilage ab ON ab.beilage_id = b.id
       WHERE ab.artikel_id = ? AND b.aktiv = 1 AND b.geloescht = 0 ORDER BY b.name`
    ).all(artikel.id).map((zeile) => zeile.name),
  }));
  antwort.json(uebersicht);
});

export default router;
