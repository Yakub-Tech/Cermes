import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { kundenzustandLesen } from '../kundenzustand.js';

const router = express.Router();

router.get('/api/kunde/artikel', (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const artikelListe = db.prepare(
    'SELECT * FROM artikel WHERE aktiv = 1 AND geloescht = 0 ORDER BY sortierung, name COLLATE NOCASE'
  ).all();
  const mitDetails = artikelListe.map((artikel) => {
    const beilagen = db.prepare(
      `SELECT b.id, b.name, b.aktiv FROM beilage b
       JOIN artikel_beilage ab ON ab.beilage_id = b.id
       WHERE ab.artikel_id = ? AND b.geloescht = 0 ORDER BY b.name`
    ).all(artikel.id);
    return {
      id: artikel.id, name: artikel.name, farbe: artikel.farbe, preis_cent: artikel.preis_cent,
      bild_url: artikel.bild_dateiname ? `/artikelbilder/${artikel.bild_dateiname}` : null,
      beilagen,
    };
  });
  antwort.json(mitDetails);
});

router.get('/api/kunde/zustand', (_anfrage, antwort) => {
  antwort.json(kundenzustandLesen());
});

export default router;
