import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { jetztIso, heutigesDatum } from '../zeit.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';
import { kundenzustandSchreiben, kassenNummerPruefen } from '../kundenzustand.js';
import { sortiereNachVon, ermittleVergabeUndNeuePosition, ermittleStatus, hinweisText } from '../nummernbloecke.js';
import { protokolliere, unterschiede } from '../audit.js';
import { ohneKosten } from './artikel.js';

const router = express.Router();

const UNERWARTETER_FEHLER = 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.';

function alsAntwort(antwort, fehler) {
  if (fehler.status) return antwort.status(fehler.status).json({ fehler: fehler.message });
  return antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
}

function bloeckeLaden(db, artikelId) {
  return sortiereNachVon(
    db.prepare('SELECT von, bis FROM artikel_nummernblock WHERE artikel_id = ?').all(artikelId)
  );
}

const STATUS_SCHWERE = {
  ok: 0, block_wechseln: 1, block_eintragen: 2, aufgebraucht: 3,
};

const SONDERWUNSCH_MAX_ZEICHEN = 100;

function pruefeSonderwunsch(wert) {
  if (wert === undefined || wert === null) return null;
  if (typeof wert !== 'string') {
    const fehler = new Error('Der Sonderwunsch ist ungültig. Bitte noch einmal eintragen.');
    fehler.status = 400;
    throw fehler;
  }
  const text = wert.trim();
  if (text.length > SONDERWUNSCH_MAX_ZEICHEN) {
    const fehler = new Error(`Der Sonderwunsch ist zu lang. Erlaubt sind höchstens ${SONDERWUNSCH_MAX_ZEICHEN} Zeichen.`);
    fehler.status = 400;
    throw fehler;
  }
  return text === '' ? null : text;
}

function bereitePositionenVor(db, positionen) {
  if (!Array.isArray(positionen) || positionen.length === 0) {
    const fehler = new Error('Der Warenkorb ist leer.');
    fehler.status = 400;
    throw fehler;
  }
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
    if (artikel.ausverkauft) {
      const fehler = new Error(`„${artikel.name}“ ist ausverkauft. Bitte Position entfernen.`);
      fehler.status = 409;
      throw fehler;
    }
    const beilagenNamen = [];
    const beilagenNamenTr = [];
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
      beilagenNamenTr.push(beilage.name_tr);
    }
    const sonderwunsch = pruefeSonderwunsch(position.sonderwunsch);
    summe += artikel.preis_cent;
    vorbereitet.push({ artikel, beilagenNamen, beilagenNamenTr, sonderwunsch });
  }
  return { vorbereitet, summe };
}

function ermittleVorschauKaertchen(db, vorbereitet) {
  const kaertchen = [];
  const naechstePositionProArtikel = new Map();
  const dringendsterZustandProArtikel = new Map();
  for (const { artikel, beilagenNamen, beilagenNamenTr, sonderwunsch } of vorbereitet) {
    let bisherigePosition = naechstePositionProArtikel.get(artikel.id);
    if (bisherigePosition === undefined) {
      bisherigePosition = db.prepare('SELECT naechste_nummer FROM artikel WHERE id = ?')
        .get(artikel.id).naechste_nummer;
    }
    const bloecke = bloeckeLaden(db, artikel.id);
    const { nummer, neuePosition } = ermittleVergabeUndNeuePosition(bloecke, bisherigePosition);
    naechstePositionProArtikel.set(artikel.id, neuePosition);
    kaertchen.push({
      artikel_name: artikel.name, artikel_name_tr: artikel.name_tr, artikel_farbe: artikel.farbe,
      preis_cent: artikel.preis_cent, beilagen: beilagenNamen, beilagen_tr: beilagenNamenTr,
      sonderwunsch, nummer, hinweis: null,
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
  return kaertchen;
}

export function kassierenVorschau(db, positionen) {
  const { vorbereitet, summe } = bereitePositionenVor(db, positionen);
  return { summe_cent: summe, kaertchen: ermittleVorschauKaertchen(db, vorbereitet) };
}

function pruefeKennung(kennung) {
  if (kennung === undefined) return;
  if (typeof kennung !== 'string' || kennung.length < 8 || kennung.length > 100) {
    const fehler = new Error('Die Buchung konnte nicht zugeordnet werden. Bitte Seite neu laden.');
    fehler.status = 400;
    throw fehler;
  }
}

function bereitsGebuchtesErgebnis(db, kennung, anfrageText) {
  const bisher = db.prepare('SELECT anfrage, antwort FROM kassiervorgang WHERE kennung = ?').get(kennung);
  if (!bisher) return null;
  if (bisher.anfrage !== anfrageText) {
    const fehler = new Error(
      'Für diese Buchung wurde schon eine andere Bestellung gebucht. Bitte Seite neu laden und im Storno-Tab nachsehen.'
    );
    fehler.status = 409;
    throw fehler;
  }
  return JSON.parse(bisher.antwort);
}

function pruefeListenlaenge(anzahlPositionen, erwarteteNummern, erwartetePreiseCent) {
  for (const liste of [erwarteteNummern, erwartetePreiseCent]) {
    if (liste === undefined || liste === null) continue;
    if (!Array.isArray(liste) || liste.length !== anzahlPositionen) {
      const fehler = new Error(
        'Der Warenkorb hat sich geändert. Bitte „Zurück“ tippen und noch einmal auf „Fertig“ gehen.'
      );
      fehler.status = 409;
      throw fehler;
    }
  }
}

export function kassieren(db, benutzer, positionen, erwarteteNummern, erwartetePreiseCent, kennung) {
  pruefeKennung(kennung);
  const anfrageText = JSON.stringify({ positionen });
  const transaktion = db.transaction(() => {
    if (kennung !== undefined) {
      const bisherigesErgebnis = bereitsGebuchtesErgebnis(db, kennung, anfrageText);
      if (bisherigesErgebnis) return bisherigesErgebnis;
    }
    const { vorbereitet, summe } = bereitePositionenVor(db, positionen);
    pruefeListenlaenge(vorbereitet.length, erwarteteNummern, erwartetePreiseCent);

    const zeitpunkt = jetztIso();
    const vorgang = db.prepare(
      'INSERT INTO kassiervorgang (zeitpunkt, summe_cent, benutzer_id, kennung, anfrage) VALUES (?, ?, ?, ?, ?)'
    ).run(zeitpunkt, summe, benutzer.id, kennung ?? null, kennung === undefined ? null : anfrageText);

    const kaertchen = [];
    const dringendsterZustandProArtikel = new Map();
    for (const [index, { artikel, beilagenNamen, beilagenNamenTr, sonderwunsch }] of vorbereitet.entries()) {
      if (erwartetePreiseCent && erwartetePreiseCent[index] !== undefined
        && erwartetePreiseCent[index] !== artikel.preis_cent) {
        const fehler = new Error(
          'Ein Preis hat sich inzwischen geändert. Bitte „Zurück“ tippen und die Bestellung erneut kassieren.'
        );
        fehler.status = 409;
        throw fehler;
      }
      const bisherigePosition = db.prepare('SELECT naechste_nummer FROM artikel WHERE id = ?')
        .get(artikel.id).naechste_nummer;
      const bloecke = bloeckeLaden(db, artikel.id);
      const { nummer, neuePosition } = ermittleVergabeUndNeuePosition(bloecke, bisherigePosition);
      if (erwarteteNummern && erwarteteNummern[index] !== undefined && erwarteteNummern[index] !== nummer) {
        const fehler = new Error(
          'Die Kärtchen-Nummern haben sich inzwischen geändert. Bitte „Zurück“ tippen und die Bestellung erneut kassieren.'
        );
        fehler.status = 409;
        throw fehler;
      }
      db.prepare('UPDATE artikel SET naechste_nummer = ? WHERE id = ?').run(neuePosition, artikel.id);
      const eintrag = db.prepare(
        `INSERT INTO kaertchen (kassiervorgang_id, artikel_id, nummer, artikel_name, artikel_name_tr,
           artikel_farbe, preis_cent, einkaufskosten_cent, beilagen, beilagen_tr, sonderwunsch, status, erstellt_am)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_bearbeitung', ?)`
      ).run(vorgang.lastInsertRowid, artikel.id, nummer, artikel.name, artikel.name_tr, artikel.farbe,
        artikel.preis_cent, artikel.einkaufskosten_cent, JSON.stringify(beilagenNamen),
        JSON.stringify(beilagenNamenTr), sonderwunsch, zeitpunkt);
      kaertchen.push({
        id: eintrag.lastInsertRowid, nummer, artikel_name: artikel.name, artikel_name_tr: artikel.name_tr,
        artikel_farbe: artikel.farbe, preis_cent: artikel.preis_cent, beilagen: beilagenNamen,
        beilagen_tr: beilagenNamenTr, sonderwunsch, hinweis: null,
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
    protokolliere(db, benutzer, 'kasse', 'kassiert', {
      werte: {
        kassiervorgang: vorgang.lastInsertRowid,
        summe_cent: summe,
        positionen: kaertchen.map((k) => ({
          nummer: k.nummer, artikel_name: k.artikel_name, beilagen: k.beilagen, sonderwunsch: k.sonderwunsch,
          preis_cent: k.preis_cent,
        })),
      },
    });
    const ergebnis = { kassiervorgang_id: vorgang.lastInsertRowid, summe_cent: summe, kaertchen };
    if (kennung !== undefined) {
      db.prepare('UPDATE kassiervorgang SET antwort = ? WHERE id = ?')
        .run(JSON.stringify(ergebnis), vorgang.lastInsertRowid);
    }
    return ergebnis;
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
      `SELECT b.id, b.name, b.name_tr, b.aktiv FROM beilage b
       JOIN artikel_beilage ab ON ab.beilage_id = b.id
       WHERE ab.artikel_id = ? AND b.geloescht = 0 ORDER BY b.name`
    ).all(artikel.id);
    return {
      ...ohneKosten(artikel), beilagen,
      bild_url: artikel.bild_dateiname ? `/artikelbilder/${artikel.bild_dateiname}` : null,
    };
  });
  antwort.json(mitBeilagen);
});

router.put('/api/kasse/kundenanzeige', brauchtRolle('kasse'), (anfrage, antwort) => {
  let kassenNummer;
  try {
    kassenNummer = kassenNummerPruefen(anfrage.body?.kasse);
  } catch (fehler) {
    return alsAntwort(antwort, fehler);
  }
  kundenzustandSchreiben(kassenNummer, anfrage.body);
  sendeEreignis('kunden_anzeige');
  antwort.json({ ok: true });
});

router.post('/api/kasse/kassieren', brauchtRolle('kasse'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  try {
    const ergebnis = kassieren(
      db, anfrage.benutzer, anfrage.body.positionen,
      anfrage.body.erwartete_nummern, anfrage.body.erwartete_preise_cent, anfrage.body.vorgang_kennung
    );
    sendeEreignis('kaertchen');
    antwort.json(ergebnis);
  } catch (fehler) {
    alsAntwort(antwort, fehler);
  }
});

router.post('/api/kasse/kassieren-vorschau', brauchtRolle('kasse'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  try {
    const ergebnis = kassierenVorschau(db, anfrage.body.positionen);
    antwort.json(ergebnis);
  } catch (fehler) {
    alsAntwort(antwort, fehler);
  }
});

router.get('/api/kasse/stornierbar', brauchtRolle('kasse'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const zeilen = db.prepare(
    `SELECT id, nummer, artikel_name, artikel_name_tr, artikel_farbe, preis_cent,
            beilagen, beilagen_tr, sonderwunsch, status, erstellt_am
     FROM kaertchen
     WHERE status IN ('in_bearbeitung', 'abholbereit') AND substr(erstellt_am, 1, 10) = ?
     ORDER BY erstellt_am DESC, id DESC`
  ).all(heutigesDatum());
  antwort.json(zeilen.map((zeile) => ({
    ...zeile, beilagen: JSON.parse(zeile.beilagen), beilagen_tr: JSON.parse(zeile.beilagen_tr),
  })));
});

router.post('/api/kasse/storno/:id', brauchtRolle('kasse'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  try {
    const stornieren = db.transaction(() => {
      const kaertchen = db.prepare('SELECT * FROM kaertchen WHERE id = ?').get(anfrage.params.id);
      const zeitpunkt = jetztIso();
      if (kaertchen && kaertchen.erstellt_am.slice(0, 10) !== zeitpunkt.slice(0, 10)) {
        const fehler = new Error('Nur heutige Kärtchen können storniert werden.');
        fehler.status = 409;
        throw fehler;
      }
      const ergebnis = db.prepare(
        `UPDATE kaertchen SET status = 'storniert', storniert_am = ?, storniert_von = ?
         WHERE id = ? AND status IN ('in_bearbeitung', 'abholbereit')`
      ).run(zeitpunkt, anfrage.benutzer.id, anfrage.params.id);
      if (ergebnis.changes === 0) return false;
      protokolliere(db, anfrage.benutzer, 'storno', 'storniert', {
        werte: { nummer: kaertchen.nummer, artikel: kaertchen.artikel_name, preis_cent: kaertchen.preis_cent,
          beilagen: JSON.parse(kaertchen.beilagen) },
        aenderungen: unterschiede(kaertchen, { status: 'storniert' }, ['status']),
      });
      return true;
    });
    if (!stornieren()) {
      return antwort.status(409).json({ fehler: 'Dieses Kärtchen kann nicht mehr storniert werden.' });
    }
  } catch (fehler) {
    return alsAntwort(antwort, fehler);
  }
  sendeEreignis('kaertchen');
  antwort.json({ ok: true });
});

export default router;
