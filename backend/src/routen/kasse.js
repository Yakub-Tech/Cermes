import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { jetztIso } from '../zeit.js';
import { brauchtRolle } from '../auth.js';

const router = express.Router();

export function kassieren(db, benutzerId, positionen) {
  if (!Array.isArray(positionen) || positionen.length === 0) {
    const fehler = new Error('Der Warenkorb ist leer.');
    fehler.status = 400;
    throw fehler;
  }
  const transaktion = db.transaction(() => {
    let summe = 0;
    const vorbereitet = [];
    for (const position of positionen) {
      const artikel = db.prepare(
        'SELECT * FROM artikel WHERE id = ? AND aktiv = 1 AND geloescht = 0'
      ).get(position.artikel_id);
      if (!artikel) {
        const fehler = new Error('Ein Artikel im Warenkorb ist nicht mehr verfügbar. Bitte Position entfernen.');
        fehler.status = 409;
        throw fehler;
      }
      const beilagenNamen = [];
      for (const beilageId of position.beilagen_ids || []) {
        const beilage = db.prepare(
          `SELECT b.* FROM beilage b
           JOIN artikel_beilage ab ON ab.beilage_id = b.id AND ab.artikel_id = ?
           WHERE b.id = ? AND b.aktiv = 1 AND b.geloescht = 0`
        ).get(artikel.id, beilageId);
        if (!beilage) {
          const fehler = new Error(`Eine Beilage für „${artikel.name}“ ist nicht mehr verfügbar. Bitte Position neu wählen.`);
          fehler.status = 409;
          throw fehler;
        }
        beilagenNamen.push(beilage.name);
      }
      summe += artikel.preis_cent;
      vorbereitet.push({ artikel, beilagenNamen });
    }

    const vorgang = db.prepare(
      'INSERT INTO kassiervorgang (zeitpunkt, summe_cent, benutzer_id) VALUES (?, ?, ?)'
    ).run(jetztIso(), summe, benutzerId);

    const kaertchen = [];
    for (const { artikel, beilagenNamen } of vorbereitet) {
      const nummer = db.prepare('SELECT naechste_nummer FROM artikel WHERE id = ?').get(artikel.id).naechste_nummer;
      db.prepare('UPDATE artikel SET naechste_nummer = naechste_nummer + 1 WHERE id = ?').run(artikel.id);
      const eintrag = db.prepare(
        `INSERT INTO kaertchen (kassiervorgang_id, artikel_id, nummer, artikel_name, artikel_farbe,
           preis_cent, einkaufskosten_cent, beilagen, status, erstellt_am)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_bearbeitung', ?)`
      ).run(vorgang.lastInsertRowid, artikel.id, nummer, artikel.name, artikel.farbe,
        artikel.preis_cent, artikel.einkaufskosten_cent, JSON.stringify(beilagenNamen), jetztIso());
      kaertchen.push({
        id: eintrag.lastInsertRowid, nummer, artikel_name: artikel.name,
        artikel_farbe: artikel.farbe, preis_cent: artikel.preis_cent, beilagen: beilagenNamen,
      });
    }
    return { kassiervorgang_id: vorgang.lastInsertRowid, summe_cent: summe, kaertchen };
  });
  return transaktion();
}

router.get('/api/kasse/artikel', brauchtRolle('kasse'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const artikelListe = db.prepare(
    'SELECT * FROM artikel WHERE aktiv = 1 AND geloescht = 0 ORDER BY sortierung, name'
  ).all();
  const mitBeilagen = artikelListe.map((artikel) => {
    const beilagen = db.prepare(
      `SELECT b.id, b.name, b.aktiv FROM beilage b
       JOIN artikel_beilage ab ON ab.beilage_id = b.id
       WHERE ab.artikel_id = ? AND b.geloescht = 0 ORDER BY b.name`
    ).all(artikel.id);
    return { ...artikel, beilagen };
  });
  antwort.json(mitBeilagen);
});

router.post('/api/kasse/kassieren', brauchtRolle('kasse'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  try {
    const ergebnis = kassieren(db, anfrage.benutzer.id, anfrage.body.positionen);
    antwort.json(ergebnis);
  } catch (fehler) {
    antwort.status(fehler.status || 500).json({ fehler: fehler.message });
  }
});

export default router;
