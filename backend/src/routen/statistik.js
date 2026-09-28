import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtRolle } from '../auth.js';

const router = express.Router();

function artikelLaden(db, whereKlausel, werte) {
  return db.prepare(
    `SELECT artikel_name,
            MAX(artikel_name_tr) AS artikel_name_tr,
            COUNT(*) AS stueck,
            SUM(preis_cent) AS umsatz_cent,
            SUM(preis_cent - COALESCE(einkaufskosten_cent, 0)) AS gewinn_cent,
            SUM(CASE WHEN einkaufskosten_cent IS NULL THEN 1 ELSE 0 END) AS stueck_ohne_kosten
     FROM kaertchen
     WHERE ${whereKlausel} AND status != 'storniert'
     GROUP BY artikel_name
     ORDER BY stueck DESC, artikel_name`
  ).all(...werte);
}

function gesamtBerechnen(artikel) {
  return {
    stueck: artikel.reduce((summe, zeile) => summe + zeile.stueck, 0),
    umsatz_cent: artikel.reduce((summe, zeile) => summe + zeile.umsatz_cent, 0),
    gewinn_cent: artikel.reduce((summe, zeile) => summe + zeile.gewinn_cent, 0),
    stueck_ohne_kosten: artikel.reduce((summe, zeile) => summe + zeile.stueck_ohne_kosten, 0),
  };
}

function stornosLaden(db, whereKlausel, werte, mitDatum) {
  const datumSpalte = mitDatum ? 'substr(k.storniert_am, 1, 10) AS datum,' : '';
  return db.prepare(
    `SELECT ${datumSpalte} substr(k.storniert_am, 12, 5) AS zeit,
            k.nummer, k.artikel_name, k.artikel_name_tr, k.preis_cent,
            COALESCE(b.benutzername, '(gelöschtes Konto)') AS storniert_von
     FROM kaertchen k
     LEFT JOIN benutzer b ON b.id = k.storniert_von
     WHERE k.status = 'storniert' AND ${whereKlausel}
     ORDER BY k.storniert_am`
  ).all(...werte);
}

function fuerRolleFiltern(ergebnis, rolle) {
  if (rolle !== 'verwaltung') return ergebnis;
  const ohneGeld = ({ umsatz_cent, gewinn_cent, stueck_ohne_kosten, ...rest }) => rest;
  return { ...ergebnis, artikel: ergebnis.artikel.map(ohneGeld), gesamt: ohneGeld(ergebnis.gesamt) };
}

router.get('/api/statistik/artikel', brauchtRolle(['admin', 'verwaltung']), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const artikel = db.prepare(
    `SELECT artikel_id AS id, artikel_name AS name, artikel_name_tr AS name_tr, MAX(id)
     FROM kaertchen GROUP BY artikel_id ORDER BY artikel_name COLLATE NOCASE`
  ).all().map(({ id, name, name_tr }) => ({ id, name, name_tr }));
  antwort.json(artikel);
});

router.get('/api/statistik/verkaufstage', brauchtRolle(['admin', 'verwaltung']), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const tage = db.prepare(
    `SELECT substr(erstellt_am, 1, 10) AS tag FROM kaertchen
     UNION
     SELECT substr(storniert_am, 1, 10) AS tag FROM kaertchen WHERE status = 'storniert'
     ORDER BY tag DESC`
  ).all().map((zeile) => zeile.tag);
  antwort.json(tage);
});

router.get('/api/statistik/tag/:datum', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const datum = anfrage.params.datum;

  const artikel = artikelLaden(db, 'substr(erstellt_am, 1, 10) = ?', [datum]);
  const gesamt = gesamtBerechnen(artikel);

  const artikelId = Number(anfrage.query.artikel_id);
  const stundenFilter = Number.isInteger(artikelId) && artikelId > 0 ? 'AND artikel_id = ?' : '';
  const stundenWerte = stundenFilter ? [datum, artikelId] : [datum];
  const stunden = db.prepare(
    `SELECT CAST(substr(erstellt_am, 12, 2) AS INTEGER) AS stunde, COUNT(*) AS stueck
     FROM kaertchen
     WHERE substr(erstellt_am, 1, 10) = ? AND status != 'storniert' ${stundenFilter}
     GROUP BY stunde ORDER BY stunde`
  ).all(...stundenWerte);

  const stornos = stornosLaden(db, 'substr(k.storniert_am, 1, 10) = ?', [datum], false);

  antwort.json(fuerRolleFiltern({ artikel, gesamt, stunden, stornos }, anfrage.benutzer.rolle));
});

router.get('/api/statistik/zeitraum', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const { von, bis } = anfrage.query;
  if (!von || !bis) {
    return antwort.status(400).json({ fehler: 'Bitte einen Start- und einen Endtag angeben.' });
  }

  const db = oeffneDatenbank();

  const artikel = artikelLaden(db, 'substr(erstellt_am, 1, 10) BETWEEN ? AND ?', [von, bis]);
  const gesamt = gesamtBerechnen(artikel);

  const artikelId = Number(anfrage.query.artikel_id);
  const tageFilter = Number.isInteger(artikelId) && artikelId > 0 ? 'AND artikel_id = ?' : '';
  const tageWerte = tageFilter ? [von, bis, artikelId] : [von, bis];
  const tage = db.prepare(
    `SELECT substr(erstellt_am, 1, 10) AS tag, COUNT(*) AS stueck
     FROM kaertchen
     WHERE substr(erstellt_am, 1, 10) BETWEEN ? AND ? AND status != 'storniert' ${tageFilter}
     GROUP BY tag ORDER BY tag`
  ).all(...tageWerte);

  const stornos = stornosLaden(db, 'substr(k.storniert_am, 1, 10) BETWEEN ? AND ?', [von, bis], true);

  antwort.json(fuerRolleFiltern({ artikel, gesamt, tage, stornos }, anfrage.benutzer.rolle));
});

export default router;
