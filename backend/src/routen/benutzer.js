import express from 'express';
import bcrypt from 'bcryptjs';
import { oeffneDatenbank } from '../db.js';
import { jetztIso } from '../zeit.js';
import { brauchtRolle } from '../auth.js';

const router = express.Router();

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
  if (!passwort || passwort.length < 8) {
    return antwort.status(400).json({ fehler: 'Das Passwort muss mindestens 8 Zeichen haben.' });
  }
  if (!['admin', 'kasse', 'belegen', 'ausgabe', 'verwaltung'].includes(rolle)) {
    return antwort.status(400).json({ fehler: 'Bitte eine Rolle wählen: Admin, Verwaltung, Kasse, Belegen oder Ausgabe.' });
  }
  const vorhanden = db.prepare('SELECT id FROM benutzer WHERE benutzername = ?')
    .get(benutzername.trim());
  if (vorhanden) {
    return antwort.status(409).json({ fehler: 'Diesen Benutzernamen gibt es schon.' });
  }
  const ergebnis = db.prepare(
    'INSERT INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)'
  ).run(benutzername.trim(), bcrypt.hashSync(passwort, 10), rolle, jetztIso());
  antwort.json(db.prepare(
    'SELECT id, benutzername, rolle, erstellt_am FROM benutzer WHERE id = ?'
  ).get(ergebnis.lastInsertRowid));
});

router.post('/api/benutzer/:id/passwort', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const { passwort } = anfrage.body;
  if (!passwort || passwort.length < 8) {
    return antwort.status(400).json({ fehler: 'Das Passwort muss mindestens 8 Zeichen haben.' });
  }
  const ergebnis = db.prepare('UPDATE benutzer SET passwort_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync(passwort, 10), anfrage.params.id);
  if (ergebnis.changes === 0) {
    return antwort.status(404).json({ fehler: 'Diesen Benutzer gibt es nicht.' });
  }
  antwort.json({ ok: true });
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
  db.prepare('DELETE FROM benutzer WHERE id = ?').run(benutzer.id);
  antwort.json({ ok: true });
});

export default router;
