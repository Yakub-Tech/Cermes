import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtRolle } from '../auth.js';

const router = express.Router();

router.get('/api/beilagen', brauchtRolle('admin'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  antwort.json(db.prepare('SELECT * FROM beilage WHERE geloescht = 0 ORDER BY name').all());
});

router.post('/api/beilagen', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const name = String(anfrage.body.name || '').trim();
  if (name === '') {
    return antwort.status(400).json({ fehler: 'Bitte einen Namen für die Beilage angeben.' });
  }
  const ergebnis = db.prepare('INSERT INTO beilage (name) VALUES (?)').run(name);
  antwort.json(db.prepare('SELECT * FROM beilage WHERE id = ?').get(ergebnis.lastInsertRowid));
});

router.put('/api/beilagen/:id', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const vorhanden = db.prepare('SELECT * FROM beilage WHERE id = ? AND geloescht = 0')
    .get(anfrage.params.id);
  if (!vorhanden) {
    return antwort.status(404).json({ fehler: 'Diese Beilage existiert nicht mehr.' });
  }
  const name = String(anfrage.body.name || '').trim();
  if (name === '') {
    return antwort.status(400).json({ fehler: 'Bitte einen Namen für die Beilage angeben.' });
  }
  const aktiv = anfrage.body.aktiv ? 1 : 0;
  db.prepare('UPDATE beilage SET name = ?, aktiv = ? WHERE id = ?').run(name, aktiv, vorhanden.id);
  antwort.json(db.prepare('SELECT * FROM beilage WHERE id = ?').get(vorhanden.id));
});

router.delete('/api/beilagen/:id', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  db.prepare('UPDATE beilage SET geloescht = 1, aktiv = 0 WHERE id = ?').run(anfrage.params.id);
  antwort.json({ ok: true });
});

export default router;
