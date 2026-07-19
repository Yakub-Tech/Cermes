import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { heutigesDatum } from '../zeit.js';
import { brauchtRolle } from '../auth.js';

const router = express.Router();

function pruefeArtikelDaten(daten) {
  if (!daten.name || String(daten.name).trim() === '') {
    return 'Bitte einen Artikelnamen angeben.';
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(daten.farbe || '')) {
    return 'Bitte eine gültige Farbe wählen.';
  }
  if (!Number.isInteger(daten.preis_cent) || daten.preis_cent < 0) {
    return 'Der Verkaufspreis muss ein Betrag ab 0 Euro sein.';
  }
  if (daten.einkaufskosten_cent !== null && daten.einkaufskosten_cent !== undefined) {
    if (!Number.isInteger(daten.einkaufskosten_cent) || daten.einkaufskosten_cent < 0) {
      return 'Die Einkaufskosten müssen leer bleiben oder ein Betrag ab 0 Euro sein.';
    }
  }
  return null;
}

function beilagenZuordnen(db, artikelId, beilagenIds) {
  db.prepare('DELETE FROM artikel_beilage WHERE artikel_id = ?').run(artikelId);
  for (const beilageId of beilagenIds || []) {
    db.prepare('INSERT INTO artikel_beilage (artikel_id, beilage_id) VALUES (?, ?)')
      .run(artikelId, beilageId);
  }
}

function artikelMitDetails(db, zeile) {
  const beilagenIds = db.prepare(
    'SELECT beilage_id FROM artikel_beilage WHERE artikel_id = ? ORDER BY beilage_id'
  ).all(zeile.id).map((z) => z.beilage_id);
  const hoechsteHeute = db.prepare(
    `SELECT MAX(nummer) AS n FROM kaertchen
     WHERE artikel_id = ? AND substr(erstellt_am, 1, 10) = ? AND status != 'storniert'`
  ).get(zeile.id, heutigesDatum()).n;
  return { ...zeile, beilagen_ids: beilagenIds, hoechste_nummer_heute: hoechsteHeute };
}

router.get('/api/artikel', brauchtRolle('admin'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const zeilen = db.prepare(
    'SELECT * FROM artikel WHERE geloescht = 0 ORDER BY sortierung, name'
  ).all();
  antwort.json(zeilen.map((zeile) => artikelMitDetails(db, zeile)));
});

router.post('/api/artikel', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const daten = anfrage.body;
  const fehler = pruefeArtikelDaten(daten);
  if (fehler) return antwort.status(400).json({ fehler });
  const ergebnis = db.prepare(
    `INSERT INTO artikel (name, farbe, preis_cent, einkaufskosten_cent, aktiv, sortierung)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(daten.name.trim(), daten.farbe, daten.preis_cent,
    daten.einkaufskosten_cent ?? null, daten.aktiv ?? 1, daten.sortierung ?? 0);
  beilagenZuordnen(db, ergebnis.lastInsertRowid, daten.beilagen_ids);
  const neu = db.prepare('SELECT * FROM artikel WHERE id = ?').get(ergebnis.lastInsertRowid);
  antwort.json(artikelMitDetails(db, neu));
});

router.put('/api/artikel/:id', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const vorhanden = db.prepare('SELECT * FROM artikel WHERE id = ? AND geloescht = 0')
    .get(anfrage.params.id);
  if (!vorhanden) {
    return antwort.status(404).json({ fehler: 'Dieser Artikel existiert nicht mehr.' });
  }
  const daten = anfrage.body;
  const fehler = pruefeArtikelDaten(daten);
  if (fehler) return antwort.status(400).json({ fehler });
  db.prepare(
    `UPDATE artikel SET name = ?, farbe = ?, preis_cent = ?, einkaufskosten_cent = ?,
       aktiv = ?, sortierung = ? WHERE id = ?`
  ).run(daten.name.trim(), daten.farbe, daten.preis_cent, daten.einkaufskosten_cent ?? null,
    daten.aktiv ?? 1, daten.sortierung ?? 0, vorhanden.id);
  beilagenZuordnen(db, vorhanden.id, daten.beilagen_ids);
  const neu = db.prepare('SELECT * FROM artikel WHERE id = ?').get(vorhanden.id);
  antwort.json(artikelMitDetails(db, neu));
});

router.delete('/api/artikel/:id', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  db.prepare('UPDATE artikel SET geloescht = 1, aktiv = 0 WHERE id = ?').run(anfrage.params.id);
  antwort.json({ ok: true });
});

export default router;
