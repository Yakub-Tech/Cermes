import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtAnmeldung, brauchtRolle } from '../auth.js';

const router = express.Router();

router.get('/api/einstellungen', brauchtAnmeldung(), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const zeile = db.prepare(
    "SELECT wert FROM einstellung WHERE schluessel = 'abholbereit_warnminuten'"
  ).get();
  antwort.json({ abholbereit_warnminuten: Number(zeile.wert) });
});

router.put('/api/einstellungen', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const minuten = Number(anfrage.body.abholbereit_warnminuten);
  if (!Number.isInteger(minuten) || minuten < 0) {
    return antwort.status(400).json({ fehler: 'Die Warnzeit muss eine ganze Zahl ab 0 Minuten sein.' });
  }
  db.prepare("UPDATE einstellung SET wert = ? WHERE schluessel = 'abholbereit_warnminuten'")
    .run(String(minuten));
  antwort.json({ abholbereit_warnminuten: minuten });
});

export default router;
