import express from 'express';
import bcrypt from 'bcryptjs';
import { oeffneDatenbank } from '../db.js';
import { jetztIso } from '../zeit.js';
import { brauchtRolle } from '../auth.js';
import { sitzungenDesKontosBeenden } from '../sitzung.js';
import { protokolliere } from '../audit.js';
import { passwortRegelFehler } from '../passwortRegeln.js';

const router = express.Router();

const UNERWARTETER_FEHLER = 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.';

router.get('/api/benutzer', brauchtRolle('admin'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  antwort.json(db.prepare(
    'SELECT id, benutzername, rolle, erstellt_am FROM benutzer ORDER BY benutzername'
  ).all());
});

router.post('/api/benutzer', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const { benutzername, passwort, rolle } = anfrage.body;
  if (!benutzername || String(benutzername).trim() === '') {
    return antwort.status(400).json({ fehler: 'Bitte einen Benutzernamen angeben.' });
  }
  const regelFehler = passwortRegelFehler(passwort);
  if (regelFehler) {
    return antwort.status(400).json({ fehler: regelFehler });
  }
  if (!['admin', 'kasse', 'belegen', 'ausgabe', 'verwaltung'].includes(rolle)) {
    return antwort.status(400).json({ fehler: 'Bitte eine Rolle wählen: Admin, Verwaltung, Kasse, Belegen oder Ausgabe.' });
  }
  const vorhanden = db.prepare('SELECT id FROM benutzer WHERE benutzername = ?')
    .get(benutzername.trim());
  if (vorhanden) {
    return antwort.status(409).json({ fehler: 'Diesen Benutzernamen gibt es schon.' });
  }
  try {
    const anlegen = db.transaction(() => {
      const ergebnis = db.prepare(
        'INSERT INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)'
      ).run(benutzername.trim(), bcrypt.hashSync(passwort, 10), rolle, jetztIso());
      protokolliere(db, anfrage.benutzer, 'benutzer', 'benutzer_angelegt', {
        werte: { konto: benutzername.trim(), rolle },
      });
      return ergebnis.lastInsertRowid;
    });
    antwort.json(db.prepare(
      'SELECT id, benutzername, rolle, erstellt_am FROM benutzer WHERE id = ?'
    ).get(anlegen()));
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

router.post('/api/benutzer/:id/passwort', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const { passwort } = anfrage.body;
  const regelFehler = passwortRegelFehler(passwort);
  if (regelFehler) {
    return antwort.status(400).json({ fehler: regelFehler });
  }
  try {
    const setzen = db.transaction(() => {
      const benutzer = db.prepare('SELECT * FROM benutzer WHERE id = ?').get(anfrage.params.id);
      if (!benutzer) return false;
      db.prepare('UPDATE benutzer SET passwort_hash = ? WHERE id = ?')
        .run(bcrypt.hashSync(passwort, 10), benutzer.id);
      sitzungenDesKontosBeenden(db, benutzer.id);
      protokolliere(db, anfrage.benutzer, 'benutzer', 'passwort_geaendert', {
        werte: { konto: benutzer.benutzername },
      });
      return true;
    });
    if (!setzen()) {
      return antwort.status(404).json({ fehler: 'Diesen Benutzer gibt es nicht.' });
    }
    antwort.json({ ok: true });
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

router.delete('/api/benutzer/:id', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const benutzer = db.prepare('SELECT * FROM benutzer WHERE id = ?').get(anfrage.params.id);
  if (!benutzer) {
    return antwort.status(404).json({ fehler: 'Diesen Benutzer gibt es nicht.' });
  }
  if (benutzer.rolle === 'admin') {
    const adminAnzahl = db.prepare("SELECT COUNT(*) AS n FROM benutzer WHERE rolle = 'admin'").get().n;
    if (adminAnzahl <= 1) {
      return antwort.status(409).json({ fehler: 'Der letzte Admin kann nicht gelöscht werden.' });
    }
  }
  try {
    const loeschen = db.transaction(() => {
      db.prepare('DELETE FROM benutzer WHERE id = ?').run(benutzer.id);
      protokolliere(db, anfrage.benutzer, 'benutzer', 'benutzer_geloescht', {
        werte: { konto: benutzer.benutzername, rolle: benutzer.rolle },
      });
    });
    loeschen();
    antwort.json({ ok: true });
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

export default router;
