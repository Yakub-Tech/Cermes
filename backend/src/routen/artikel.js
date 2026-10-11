import express from 'express';
import crypto from 'node:crypto';
import { oeffneDatenbank } from '../db.js';
import { heutigesDatum } from '../zeit.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';
import { pruefeBloecke, sortiereNachVon, ermittleStatus, hinweisText } from '../nummernbloecke.js';
import { protokolliere, protokolliereAenderung, unterschiede } from '../audit.js';

const router = express.Router();

const DEFAULT_NUMMERNBLOCK = [{ von: 1, bis: 999999999 }];

const UNERWARTETER_FEHLER = 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.';

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

function normalisiereNameTr(wert) {
  const getrimmt = String(wert ?? '').trim();
  return getrimmt === '' ? null : getrimmt;
}

function beilagenZuordnen(db, artikelId, beilagenIds) {
  db.prepare('DELETE FROM artikel_beilage WHERE artikel_id = ?').run(artikelId);
  for (const beilageId of beilagenIds || []) {
    db.prepare('INSERT INTO artikel_beilage (artikel_id, beilage_id) VALUES (?, ?)')
      .run(artikelId, beilageId);
  }
}

function beilagenNamenFuerArtikel(db, artikelId) {
  return db.prepare(
    `SELECT b.name FROM artikel_beilage ab JOIN beilage b ON b.id = ab.beilage_id
     WHERE ab.artikel_id = ? ORDER BY ab.beilage_id`
  ).all(artikelId).map((zeile) => zeile.name);
}

function bloeckeAlsText(bloecke) {
  return sortiereNachVon(bloecke).map((block) => `${block.von}-${block.bis}`);
}

export function ohneKosten({ einkaufskosten_cent, ...rest }) {
  return rest;
}

function bloeckeLaden(db, artikelId) {
  return sortiereNachVon(
    db.prepare('SELECT von, bis FROM artikel_nummernblock WHERE artikel_id = ?').all(artikelId)
  );
}

function bloeckeSpeichern(db, artikelId, bloecke) {
  db.prepare('DELETE FROM artikel_nummernblock WHERE artikel_id = ?').run(artikelId);
  for (const block of bloecke) {
    db.prepare('INSERT INTO artikel_nummernblock (artikel_id, von, bis) VALUES (?, ?, ?)')
      .run(artikelId, block.von, block.bis);
  }
}

function hoechsteNummerHeute(db, artikelId) {
  return db.prepare(
    `SELECT MAX(nummer) AS n FROM kaertchen
     WHERE artikel_id = ? AND substr(erstellt_am, 1, 10) = ?`
  ).get(artikelId, heutigesDatum()).n;
}

const STAND_SCHLUESSEL = crypto.randomBytes(32);

function artikelStand(zeile, beilagenIds, bloecke) {
  const werte = JSON.stringify([
    zeile.name, zeile.name_tr, zeile.farbe, zeile.preis_cent, zeile.einkaufskosten_cent,
    zeile.aktiv, zeile.sortierung, beilagenIds, bloecke.map((block) => [block.von, block.bis]),
  ]);
  return crypto.createHmac('sha256', STAND_SCHLUESSEL).update(werte).digest('hex');
}

export function artikelMitDetails(db, zeile) {
  const beilagenIds = db.prepare(
    'SELECT beilage_id FROM artikel_beilage WHERE artikel_id = ? ORDER BY beilage_id'
  ).all(zeile.id).map((z) => z.beilage_id);
  const hoechsteHeute = hoechsteNummerHeute(db, zeile.id);
  const bloecke = bloeckeLaden(db, zeile.id);
  const statusInfo = ermittleStatus(bloecke, zeile.naechste_nummer);
  return {
    ...zeile, beilagen_ids: beilagenIds, hoechste_nummer_heute: hoechsteHeute,
    stand: artikelStand(zeile, beilagenIds, bloecke),
    bild_url: zeile.bild_dateiname ? `/artikelbilder/${zeile.bild_dateiname}` : null,
    bloecke, hinweis: hinweisText(statusInfo.status, statusInfo),
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
  const bloecke = daten.bloecke === undefined ? DEFAULT_NUMMERNBLOCK : daten.bloecke;
  const bloeckeFehler = pruefeBloecke(bloecke);
  if (bloeckeFehler) return antwort.status(400).json({ fehler: bloeckeFehler });
  const istVerwaltung = anfrage.benutzer.rolle === 'verwaltung';
  const einkaufskostenCent = istVerwaltung ? null : (daten.einkaufskosten_cent ?? null);
  try {
    const anlegen = db.transaction(() => {
      const ergebnis = db.prepare(
        `INSERT INTO artikel (name, name_tr, farbe, preis_cent, einkaufskosten_cent, aktiv, sortierung)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(daten.name.trim(), normalisiereNameTr(daten.name_tr), daten.farbe, daten.preis_cent,
        einkaufskostenCent, daten.aktiv ?? 1, daten.sortierung ?? 0);
      beilagenZuordnen(db, ergebnis.lastInsertRowid, daten.beilagen_ids);
      bloeckeSpeichern(db, ergebnis.lastInsertRowid, bloecke);
      protokolliere(db, anfrage.benutzer, 'artikel', 'artikel_angelegt', {
        werte: {
          artikel: daten.name.trim(), preis_cent: daten.preis_cent, einkaufskosten_cent: einkaufskostenCent,
          farbe: daten.farbe, beilagen: beilagenNamenFuerArtikel(db, ergebnis.lastInsertRowid),
          name_tr: normalisiereNameTr(daten.name_tr), sortierung: daten.sortierung ?? 0,
          aktiv: daten.aktiv ?? 1, bloecke: bloeckeAlsText(bloecke),
        },
      });
      return ergebnis.lastInsertRowid;
    });
    const neuId = anlegen();
    const neu = db.prepare('SELECT * FROM artikel WHERE id = ?').get(neuId);
    sendeEreignis('artikel');
    const antwortDaten = artikelMitDetails(db, neu);
    antwort.json(istVerwaltung ? ohneKosten(antwortDaten) : antwortDaten);
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
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
  if (daten.erwarteter_stand !== undefined
      && daten.erwarteter_stand !== artikelMitDetails(db, vorhanden).stand) {
    return antwort.status(409).json({
      fehler: 'Dieser Artikel wurde inzwischen geändert. Bitte das Fenster schließen und den Artikel neu öffnen.',
    });
  }
  if (daten.bloecke !== undefined) {
    const bloeckeFehler = pruefeBloecke(daten.bloecke);
    if (bloeckeFehler) return antwort.status(400).json({ fehler: bloeckeFehler });
  }
  const istVerwaltung = anfrage.benutzer.rolle === 'verwaltung';
  const einkaufskostenCent = istVerwaltung
    ? vorhanden.einkaufskosten_cent
    : (daten.einkaufskosten_cent ?? null);
  const nameTr = 'name_tr' in daten ? normalisiereNameTr(daten.name_tr) : vorhanden.name_tr;
  try {
    const aendern = db.transaction(() => {
      const vorherWerte = {
        name: vorhanden.name, name_tr: vorhanden.name_tr, farbe: vorhanden.farbe,
        preis_cent: vorhanden.preis_cent, einkaufskosten_cent: vorhanden.einkaufskosten_cent,
        aktiv: vorhanden.aktiv, sortierung: vorhanden.sortierung,
        beilagen: beilagenNamenFuerArtikel(db, vorhanden.id),
        bloecke: bloeckeAlsText(bloeckeLaden(db, vorhanden.id)),
      };
      db.prepare(
        `UPDATE artikel SET name = ?, name_tr = ?, farbe = ?, preis_cent = ?, einkaufskosten_cent = ?,
           aktiv = ?, sortierung = ? WHERE id = ?`
      ).run(daten.name.trim(), nameTr, daten.farbe, daten.preis_cent,
        einkaufskostenCent, daten.aktiv ?? 1, daten.sortierung ?? 0, vorhanden.id);
      beilagenZuordnen(db, vorhanden.id, daten.beilagen_ids);
      if (daten.bloecke !== undefined) {
        bloeckeSpeichern(db, vorhanden.id, daten.bloecke);
      }
      const nachherWerte = {
        name: daten.name.trim(), name_tr: nameTr, farbe: daten.farbe,
        preis_cent: daten.preis_cent, einkaufskosten_cent: einkaufskostenCent,
        aktiv: daten.aktiv ?? 1, sortierung: daten.sortierung ?? 0,
        beilagen: beilagenNamenFuerArtikel(db, vorhanden.id),
        bloecke: bloeckeAlsText(bloeckeLaden(db, vorhanden.id)),
      };
      protokolliereAenderung(db, anfrage.benutzer, 'artikel', 'artikel', { artikel: nachherWerte.name },
        unterschiede(vorherWerte, nachherWerte,
          ['name', 'name_tr', 'farbe', 'preis_cent', 'einkaufskosten_cent', 'aktiv', 'sortierung', 'beilagen', 'bloecke']));
    });
    aendern();
    const neu = db.prepare('SELECT * FROM artikel WHERE id = ?').get(vorhanden.id);
    sendeEreignis('artikel');
    const antwortDaten = artikelMitDetails(db, neu);
    antwort.json(istVerwaltung ? ohneKosten(antwortDaten) : antwortDaten);
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

router.put('/api/artikel/:id/aktiv', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const aktiv = anfrage.body.aktiv;
  if (aktiv !== 0 && aktiv !== 1) {
    return antwort.status(400).json({ fehler: 'Bitte aktiv oder inaktiv angeben.' });
  }
  try {
    const umschalten = db.transaction(() => {
      const artikel = db.prepare('SELECT * FROM artikel WHERE id = ? AND geloescht = 0').get(anfrage.params.id);
      if (!artikel) return null;
      db.prepare('UPDATE artikel SET aktiv = ? WHERE id = ?').run(aktiv, artikel.id);
      protokolliereAenderung(db, anfrage.benutzer, 'artikel', 'artikel', { artikel: artikel.name },
        unterschiede({ aktiv: artikel.aktiv }, { aktiv }, ['aktiv']));
      return artikel.id;
    });
    const artikelId = umschalten();
    if (artikelId === null) {
      return antwort.status(404).json({ fehler: 'Dieser Artikel existiert nicht mehr.' });
    }
    sendeEreignis('artikel');
    const neu = artikelMitDetails(db, db.prepare('SELECT * FROM artikel WHERE id = ?').get(artikelId));
    antwort.json(anfrage.benutzer.rolle === 'verwaltung' ? ohneKosten(neu) : neu);
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

router.post('/api/artikel/:id/startnummer', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const artikelId = Number(anfrage.params.id);
  const artikel = db.prepare('SELECT * FROM artikel WHERE id = ?').get(artikelId);
  if (!artikel) {
    return antwort.status(404).json({ fehler: 'Dieser Artikel existiert nicht mehr.' });
  }
  const neueNummer = Number(anfrage.body.naechste_nummer);
  if (!Number.isInteger(neueNummer) || neueNummer < 1) {
    return antwort.status(400).json({ fehler: 'Die Startnummer muss eine ganze Zahl ab 1 sein.' });
  }
  const hoechsteHeute = hoechsteNummerHeute(db, artikelId);
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
  try {
    const setzen = db.transaction(() => {
      db.prepare('UPDATE artikel SET naechste_nummer = ? WHERE id = ?').run(neueNummer, artikelId);
      const aenderungen = unterschiede(
        { naechste_nummer: artikel.naechste_nummer }, { naechste_nummer: neueNummer }, ['naechste_nummer']
      );
      if (Object.keys(aenderungen).length > 0) {
        const werte = { artikel: artikel.name };
        if (anfrage.body.warnung_bestaetigt) werte.warnung_bestaetigt = 1;
        protokolliere(db, anfrage.benutzer, 'artikel', 'startnummer_gesetzt', { werte, aenderungen });
      }
    });
    setzen();
    sendeEreignis('artikel');
    antwort.json({ ok: true });
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

router.delete('/api/artikel/:id', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  try {
    const loeschen = db.transaction(() => {
      const artikel = db.prepare('SELECT * FROM artikel WHERE id = ? AND geloescht = 0').get(anfrage.params.id);
      if (!artikel) return;
      db.prepare('UPDATE artikel SET geloescht = 1, aktiv = 0 WHERE id = ?').run(artikel.id);
      protokolliere(db, anfrage.benutzer, 'artikel', 'artikel_geloescht', { werte: { artikel: artikel.name } });
    });
    loeschen();
    sendeEreignis('artikel');
    antwort.json({ ok: true });
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

export default router;
