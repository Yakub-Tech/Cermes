import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { jetztIso, heutigesDatum } from '../zeit.js';
import { brauchtRolle } from '../auth.js';

const router = express.Router();

const erlaubteWechsel = [
  ['in_bearbeitung', 'abholbereit'],
  ['abholbereit', 'abgeholt'],
  ['abholbereit', 'in_bearbeitung'],
  ['abgeholt', 'abholbereit'],
];

function kaertchenFuerAusgabe(db, status, sortierung) {
  const zeilen = db.prepare(
    `SELECT id, nummer, artikel_name, artikel_farbe, beilagen, erstellt_am, abholbereit_am, abgeholt_am
     FROM kaertchen
     WHERE status = ? AND substr(erstellt_am, 1, 10) = ?
     ORDER BY ${sortierung}`
  ).all(status, heutigesDatum());
  return zeilen.map((zeile) => ({ ...zeile, beilagen: JSON.parse(zeile.beilagen) }));
}

router.get('/api/ausgabe/kaertchen', brauchtRolle('ausgabe'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  antwort.json({
    in_bearbeitung: kaertchenFuerAusgabe(db, 'in_bearbeitung', 'erstellt_am, id'),
    abholbereit: kaertchenFuerAusgabe(db, 'abholbereit', 'abholbereit_am, id'),
    zuletzt_abgeholt: kaertchenFuerAusgabe(db, 'abgeholt', 'abgeholt_am DESC, id DESC').slice(0, 10),
  });
});

router.post('/api/ausgabe/status/:id', brauchtRolle('ausgabe'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const neuerStatus = anfrage.body.status;
  const kaertchen = db.prepare('SELECT * FROM kaertchen WHERE id = ?').get(anfrage.params.id);
  if (!kaertchen) {
    return antwort.status(404).json({ fehler: 'Dieses Kärtchen gibt es nicht.' });
  }
  const erlaubt = erlaubteWechsel.some(
    ([von, nach]) => von === kaertchen.status && nach === neuerStatus
  );
  if (!erlaubt) {
    return antwort.status(409).json({ fehler: 'Das Kärtchen wurde inzwischen anderweitig geändert.' });
  }
  const zeitSpalte = neuerStatus === 'abholbereit' ? 'abholbereit_am'
    : neuerStatus === 'abgeholt' ? 'abgeholt_am' : null;
  const setzeZeit = zeitSpalte ? `, ${zeitSpalte} = ?` : '';
  const werte = zeitSpalte
    ? [neuerStatus, jetztIso(), kaertchen.id, kaertchen.status]
    : [neuerStatus, kaertchen.id, kaertchen.status];
  const ergebnis = db.prepare(
    `UPDATE kaertchen SET status = ?${setzeZeit} WHERE id = ? AND status = ?`
  ).run(...werte);
  if (ergebnis.changes === 0) {
    return antwort.status(409).json({ fehler: 'Das Kärtchen wurde inzwischen anderweitig geändert.' });
  }
  antwort.json({ ok: true });
});

router.get('/api/ausgabe/beilagen-uebersicht', brauchtRolle('ausgabe'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const artikelListe = db.prepare(
    'SELECT id, name FROM artikel WHERE aktiv = 1 AND geloescht = 0 ORDER BY sortierung, name'
  ).all();
  const uebersicht = artikelListe.map((artikel) => ({
    artikel_name: artikel.name,
    beilagen: db.prepare(
      `SELECT b.name FROM beilage b
       JOIN artikel_beilage ab ON ab.beilage_id = b.id
       WHERE ab.artikel_id = ? AND b.aktiv = 1 AND b.geloescht = 0 ORDER BY b.name`
    ).all(artikel.id).map((zeile) => zeile.name),
  }));
  antwort.json(uebersicht);
});

export default router;
