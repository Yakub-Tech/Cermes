import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { jetztIso, heutigesDatum } from '../zeit.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';
import { kundenzustandSchreiben } from '../kundenzustand.js';
import { sortiereNachVon, ermittleVergabeUndNeuePosition, ermittleStatus, hinweisText } from '../nummernbloecke.js';

const router = express.Router();

function bloeckeLaden(db, artikelId) {
  return sortiereNachVon(
    db.prepare('SELECT von, bis FROM artikel_nummernblock WHERE artikel_id = ?').all(artikelId)
  );
}

const STATUS_SCHWERE = {
  ok: 0, block_wechseln: 1, block_eintragen: 2, aufgebraucht: 3,
};

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
    const dringendsterZustandProArtikel = new Map();
    for (const { artikel, beilagenNamen } of vorbereitet) {
      const bisherigePosition = db.prepare('SELECT naechste_nummer FROM artikel WHERE id = ?')
        .get(artikel.id).naechste_nummer;
      const bloecke = bloeckeLaden(db, artikel.id);
      const { nummer, neuePosition } = ermittleVergabeUndNeuePosition(bloecke, bisherigePosition);
      db.prepare('UPDATE artikel SET naechste_nummer = ? WHERE id = ?').run(neuePosition, artikel.id);
      const eintrag = db.prepare(
        `INSERT INTO kaertchen (kassiervorgang_id, artikel_id, nummer, artikel_name, artikel_farbe,
           preis_cent, einkaufskosten_cent, beilagen, status, erstellt_am)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_bearbeitung', ?)`
      ).run(vorgang.lastInsertRowid, artikel.id, nummer, artikel.name, artikel.farbe,
        artikel.preis_cent, artikel.einkaufskosten_cent, JSON.stringify(beilagenNamen), jetztIso());
      kaertchen.push({
        id: eintrag.lastInsertRowid, nummer, artikel_name: artikel.name,
        artikel_farbe: artikel.farbe, preis_cent: artikel.preis_cent, beilagen: beilagenNamen,
        hinweis: null,
      });
      const statusInfo = ermittleStatus(bloecke, nummer);
      const bisher = dringendsterZustandProArtikel.get(artikel.id);
      if (!bisher || STATUS_SCHWERE[statusInfo.status] >= STATUS_SCHWERE[bisher.statusInfo.status]) {
        dringendsterZustandProArtikel.set(artikel.id, { kaertchenIndex: kaertchen.length - 1, statusInfo });
      }
    }
    for (const { kaertchenIndex, statusInfo } of dringendsterZustandProArtikel.values()) {
      kaertchen[kaertchenIndex].hinweis = hinweisText(statusInfo.status, statusInfo);
    }
    return { kassiervorgang_id: vorgang.lastInsertRowid, summe_cent: summe, kaertchen };
  });
  return transaktion();
}

router.get('/api/kasse/artikel', brauchtRolle('kasse'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const artikelListe = db.prepare(
    'SELECT * FROM artikel WHERE aktiv = 1 AND geloescht = 0 ORDER BY sortierung, name COLLATE NOCASE'
  ).all();
  const mitBeilagen = artikelListe.map((artikel) => {
    const beilagen = db.prepare(
      `SELECT b.id, b.name, b.aktiv FROM beilage b
       JOIN artikel_beilage ab ON ab.beilage_id = b.id
       WHERE ab.artikel_id = ? AND b.geloescht = 0 ORDER BY b.name`
    ).all(artikel.id);
    return {
      ...artikel, beilagen,
      bild_url: artikel.bild_dateiname ? `/artikelbilder/${artikel.bild_dateiname}` : null,
    };
  });
  antwort.json(mitBeilagen);
});

router.put('/api/kasse/kundenanzeige', brauchtRolle('kasse'), (anfrage, antwort) => {
  kundenzustandSchreiben(anfrage.body);
  sendeEreignis('kunden_anzeige');
  antwort.json({ ok: true });
});

router.post('/api/kasse/kassieren', brauchtRolle('kasse'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  try {
    const ergebnis = kassieren(db, anfrage.benutzer.id, anfrage.body.positionen);
    sendeEreignis('kaertchen');
    antwort.json(ergebnis);
  } catch (fehler) {
    antwort.status(fehler.status || 500).json({ fehler: fehler.message });
  }
});

router.get('/api/kasse/stornierbar', brauchtRolle('kasse'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const zeilen = db.prepare(
    `SELECT id, nummer, artikel_name, artikel_farbe, preis_cent, beilagen, status, erstellt_am
     FROM kaertchen
     WHERE status IN ('in_bearbeitung', 'abholbereit') AND substr(erstellt_am, 1, 10) = ?
     ORDER BY erstellt_am DESC, id DESC`
  ).all(heutigesDatum());
  antwort.json(zeilen.map((zeile) => ({ ...zeile, beilagen: JSON.parse(zeile.beilagen) })));
});

router.post('/api/kasse/storno/:id', brauchtRolle('kasse'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const ergebnis = db.prepare(
    `UPDATE kaertchen SET status = 'storniert', storniert_am = ?, storniert_von = ?
     WHERE id = ? AND status IN ('in_bearbeitung', 'abholbereit')`
  ).run(jetztIso(), anfrage.benutzer.id, anfrage.params.id);
  if (ergebnis.changes === 0) {
    return antwort.status(409).json({ fehler: 'Dieses Kärtchen kann nicht mehr storniert werden.' });
  }
  sendeEreignis('kaertchen');
  antwort.json({ ok: true });
});

export default router;
