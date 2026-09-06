import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { heutigesDatum } from '../zeit.js';

const router = express.Router();

function tvKaertchen(db, status, sortierung) {
  return db.prepare(
    `SELECT nummer, artikel_name, artikel_farbe FROM kaertchen
     WHERE status = ? AND substr(erstellt_am, 1, 10) = ?
     ORDER BY ${sortierung}`
  ).all(status, heutigesDatum());
}

router.get('/api/tv/kaertchen', (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  antwort.json({
    in_bearbeitung: tvKaertchen(db, 'in_bearbeitung', 'nummer'),
    abholbereit: tvKaertchen(db, 'abholbereit', 'nummer'),
  });
});

router.get('/api/tv/werbung', (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const bilder = db.prepare('SELECT id, dateiname FROM werbebild WHERE aktiv = 1 ORDER BY id').all();
  antwort.json(bilder.map((bild) => ({ id: bild.id, url: `/werbung/${bild.dateiname}` })));
});

export default router;
