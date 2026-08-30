import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { oeffneDatenbank, datenVerzeichnis } from '../db.js';
import { heutigesDatum } from '../zeit.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';

const router = express.Router();

const erlaubteBildTypen = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function artikelBilderOrdner() {
  const ordner = path.join(datenVerzeichnis(), 'artikelbilder');
  fs.mkdirSync(ordner, { recursive: true });
  return ordner;
}

const bildUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

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

function ohneKosten({ einkaufskosten_cent, ...rest }) {
  return rest;
}

function artikelMitDetails(db, zeile) {
  const beilagenIds = db.prepare(
    'SELECT beilage_id FROM artikel_beilage WHERE artikel_id = ? ORDER BY beilage_id'
  ).all(zeile.id).map((z) => z.beilage_id);
  const hoechsteHeute = db.prepare(
    `SELECT MAX(nummer) AS n FROM kaertchen
     WHERE artikel_id = ? AND substr(erstellt_am, 1, 10) = ? AND status != 'storniert'`
  ).get(zeile.id, heutigesDatum()).n;
  return {
    ...zeile, beilagen_ids: beilagenIds, hoechste_nummer_heute: hoechsteHeute,
    bild_url: zeile.bild_dateiname ? `/artikelbilder/${zeile.bild_dateiname}` : null,
  };
}

router.get('/api/artikel', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const zeilen = db.prepare(
    'SELECT * FROM artikel WHERE geloescht = 0 ORDER BY sortierung, name COLLATE NOCASE'
  ).all();
  const artikelListe = zeilen.map((zeile) => artikelMitDetails(db, zeile));
  antwort.json(anfrage.benutzer.rolle === 'verwaltung' ? artikelListe.map(ohneKosten) : artikelListe);
});

router.post('/api/artikel', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const daten = anfrage.body;
  const fehler = pruefeArtikelDaten(daten);
  if (fehler) return antwort.status(400).json({ fehler });
  const istVerwaltung = anfrage.benutzer.rolle === 'verwaltung';
  const einkaufskostenCent = istVerwaltung ? null : (daten.einkaufskosten_cent ?? null);
  const ergebnis = db.prepare(
    `INSERT INTO artikel (name, farbe, preis_cent, einkaufskosten_cent, aktiv, sortierung)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(daten.name.trim(), daten.farbe, daten.preis_cent,
    einkaufskostenCent, daten.aktiv ?? 1, daten.sortierung ?? 0);
  beilagenZuordnen(db, ergebnis.lastInsertRowid, daten.beilagen_ids);
  const neu = db.prepare('SELECT * FROM artikel WHERE id = ?').get(ergebnis.lastInsertRowid);
  sendeEreignis('artikel');
  const antwortDaten = artikelMitDetails(db, neu);
  antwort.json(istVerwaltung ? ohneKosten(antwortDaten) : antwortDaten);
});

router.put('/api/artikel/:id', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const vorhanden = db.prepare('SELECT * FROM artikel WHERE id = ? AND geloescht = 0')
    .get(anfrage.params.id);
  if (!vorhanden) {
    return antwort.status(404).json({ fehler: 'Dieser Artikel existiert nicht mehr.' });
  }
  const daten = anfrage.body;
  const fehler = pruefeArtikelDaten(daten);
  if (fehler) return antwort.status(400).json({ fehler });
  const istVerwaltung = anfrage.benutzer.rolle === 'verwaltung';
  const einkaufskostenCent = istVerwaltung
    ? vorhanden.einkaufskosten_cent
    : (daten.einkaufskosten_cent ?? null);
  db.prepare(
    `UPDATE artikel SET name = ?, farbe = ?, preis_cent = ?, einkaufskosten_cent = ?,
       aktiv = ?, sortierung = ? WHERE id = ?`
  ).run(daten.name.trim(), daten.farbe, daten.preis_cent, einkaufskostenCent,
    daten.aktiv ?? 1, daten.sortierung ?? 0, vorhanden.id);
  beilagenZuordnen(db, vorhanden.id, daten.beilagen_ids);
  const neu = db.prepare('SELECT * FROM artikel WHERE id = ?').get(vorhanden.id);
  sendeEreignis('artikel');
  const antwortDaten = artikelMitDetails(db, neu);
  antwort.json(istVerwaltung ? ohneKosten(antwortDaten) : antwortDaten);
});

router.post('/api/artikel/:id/startnummer', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const artikelId = Number(anfrage.params.id);
  const neueNummer = Number(anfrage.body.naechste_nummer);
  if (!Number.isInteger(neueNummer) || neueNummer < 1) {
    return antwort.status(400).json({ fehler: 'Die Startnummer muss eine ganze Zahl ab 1 sein.' });
  }
  const hoechsteHeute = db.prepare(
    `SELECT MAX(nummer) AS n FROM kaertchen
     WHERE artikel_id = ? AND substr(erstellt_am, 1, 10) = ? AND status != 'storniert'`
  ).get(artikelId, heutigesDatum()).n;
  const aktiveKollision = db.prepare(
    `SELECT COUNT(*) AS n FROM kaertchen
     WHERE artikel_id = ? AND status IN ('in_bearbeitung', 'abholbereit') AND nummer >= ?`
  ).get(artikelId, neueNummer).n;
  const warnungNoetig = (hoechsteHeute !== null && neueNummer <= hoechsteHeute) || aktiveKollision > 0;
  if (warnungNoetig && !anfrage.body.warnung_bestaetigt) {
    return antwort.status(409).json({
      warnung: { hoechste_nummer_heute: hoechsteHeute, aktive_kollisionen: aktiveKollision },
    });
  }
  db.prepare('UPDATE artikel SET naechste_nummer = ? WHERE id = ?').run(neueNummer, artikelId);
  sendeEreignis('artikel');
  antwort.json({ ok: true });
});

router.delete('/api/artikel/:id', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  db.prepare('UPDATE artikel SET geloescht = 1, aktiv = 0 WHERE id = ?').run(anfrage.params.id);
  sendeEreignis('artikel');
  antwort.json({ ok: true });
});

router.post('/api/artikel/:id/bild', brauchtRolle(['admin', 'verwaltung']),
  bildUpload.single('bild'), (anfrage, antwort) => {
    const db = oeffneDatenbank();
    const vorhanden = db.prepare('SELECT * FROM artikel WHERE id = ? AND geloescht = 0')
      .get(anfrage.params.id);
    if (!vorhanden) {
      return antwort.status(404).json({ fehler: 'Dieser Artikel existiert nicht mehr.' });
    }
    if (!anfrage.file) {
      return antwort.status(400).json({ fehler: 'Bitte eine Bilddatei auswählen.' });
    }
    const endung = erlaubteBildTypen[anfrage.file.mimetype];
    if (!endung) {
      return antwort.status(400).json({ fehler: 'Nur Bilder im Format PNG, JPEG oder WebP sind erlaubt.' });
    }
    const dateiname = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${endung}`;
    fs.writeFileSync(path.join(artikelBilderOrdner(), dateiname), anfrage.file.buffer);
    db.prepare('UPDATE artikel SET bild_dateiname = ? WHERE id = ?').run(dateiname, vorhanden.id);
    if (vorhanden.bild_dateiname) {
      const alteDatei = path.join(artikelBilderOrdner(), vorhanden.bild_dateiname);
      try {
        if (fs.existsSync(alteDatei)) fs.unlinkSync(alteDatei);
      } catch {
      }
    }
    const neu = db.prepare('SELECT * FROM artikel WHERE id = ?').get(vorhanden.id);
    sendeEreignis('artikel');
    antwort.json(artikelMitDetails(db, neu));
  });

router.delete('/api/artikel/:id/bild', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const vorhanden = db.prepare('SELECT * FROM artikel WHERE id = ? AND geloescht = 0')
    .get(anfrage.params.id);
  if (!vorhanden) {
    return antwort.status(404).json({ fehler: 'Dieser Artikel existiert nicht mehr.' });
  }
  if (vorhanden.bild_dateiname) {
    const datei = path.join(artikelBilderOrdner(), vorhanden.bild_dateiname);
    if (fs.existsSync(datei)) fs.unlinkSync(datei);
  }
  db.prepare('UPDATE artikel SET bild_dateiname = NULL WHERE id = ?').run(vorhanden.id);
  sendeEreignis('artikel');
  antwort.json({ ok: true });
});

export { artikelBilderOrdner };
export default router;
