import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';
import { kaertchenFuerAusgabe, nachArtikelUndNummerAufsteigend, nachArtikelUndNummerAbsteigend } from '../kaertchenListen.js';
import { versucheStatusWechsel } from '../kaertchenStatusWechsel.js';

const router = express.Router();

const erlaubteWechsel = [
  ['abholbereit', 'abgeholt'],
  ['abgeholt', 'abholbereit'],
];

router.get('/api/ausgabe/kaertchen', brauchtRolle('ausgabe'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  antwort.json({
    abholbereit: kaertchenFuerAusgabe(db, 'abholbereit').sort(nachArtikelUndNummerAufsteigend),
    zuletzt_abgeholt: kaertchenFuerAusgabe(db, 'abgeholt', 'abgeholt_am DESC, id DESC')
      .slice(0, 30)
      .sort(nachArtikelUndNummerAbsteigend),
  });
});

router.post('/api/ausgabe/status/:id', brauchtRolle('ausgabe'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const neuerStatus = anfrage.body.status;
  const kaertchen = db.prepare('SELECT * FROM kaertchen WHERE id = ?').get(anfrage.params.id);
  if (!kaertchen) {
    return antwort.status(404).json({ fehler: 'Dieses Kärtchen gibt es nicht.' });
  }
  if (!versucheStatusWechsel(db, kaertchen, neuerStatus, erlaubteWechsel)) {
    return antwort.status(409).json({ fehler: 'Das Kärtchen wurde inzwischen anderweitig geändert.' });
  }
  sendeEreignis('kaertchen');
  antwort.json({ ok: true });
});

export default router;
