import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtRolle } from '../auth.js';

const router = express.Router();

router.get('/api/statistik/verkaufstage', brauchtRolle('admin'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const tage = db.prepare(
    `SELECT DISTINCT substr(erstellt_am, 1, 10) AS tag FROM kaertchen
     WHERE status != 'storniert' ORDER BY tag DESC`
  ).all().map((zeile) => zeile.tag);
  antwort.json(tage);
});

router.get('/api/statistik/tag/:datum', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const datum = anfrage.params.datum;

  const artikel = db.prepare(
    `SELECT artikel_name,
            COUNT(*) AS stueck,
            SUM(preis_cent) AS umsatz_cent,
            COALESCE(SUM(CASE WHEN einkaufskosten_cent IS NOT NULL
                              THEN preis_cent - einkaufskosten_cent END), 0) AS gewinn_cent,
            SUM(CASE WHEN einkaufskosten_cent IS NULL THEN 1 ELSE 0 END) AS stueck_ohne_kosten
     FROM kaertchen
     WHERE substr(erstellt_am, 1, 10) = ? AND status != 'storniert'
     GROUP BY artikel_name
     ORDER BY stueck DESC, artikel_name`
  ).all(datum);

  const gesamt = {
    stueck: artikel.reduce((summe, zeile) => summe + zeile.stueck, 0),
    umsatz_cent: artikel.reduce((summe, zeile) => summe + zeile.umsatz_cent, 0),
    gewinn_cent: artikel.reduce((summe, zeile) => summe + zeile.gewinn_cent, 0),
    stueck_ohne_kosten: artikel.reduce((summe, zeile) => summe + zeile.stueck_ohne_kosten, 0),
  };

  const artikelId = Number(anfrage.query.artikel_id);
  const stundenFilter = Number.isInteger(artikelId) && artikelId > 0 ? 'AND artikel_id = ?' : '';
  const stundenWerte = stundenFilter ? [datum, artikelId] : [datum];
  const stunden = db.prepare(
    `SELECT CAST(substr(erstellt_am, 12, 2) AS INTEGER) AS stunde, COUNT(*) AS stueck
     FROM kaertchen
     WHERE substr(erstellt_am, 1, 10) = ? AND status != 'storniert' ${stundenFilter}
     GROUP BY stunde ORDER BY stunde`
  ).all(...stundenWerte);

  const stornos = db.prepare(
    `SELECT substr(k.storniert_am, 12, 5) AS zeit, k.nummer, k.artikel_name, k.preis_cent,
            b.benutzername AS storniert_von
     FROM kaertchen k
     JOIN benutzer b ON b.id = k.storniert_von
     WHERE k.status = 'storniert' AND substr(k.storniert_am, 1, 10) = ?
     ORDER BY k.storniert_am`
  ).all(datum);

  antwort.json({ artikel, gesamt, stunden, stornos });
});

export default router;
