import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';

const router = express.Router();

function normalisiereNameTr(wert) {
  const getrimmt = String(wert ?? '').trim();
  return getrimmt === '' ? null : getrimmt;
}

router.get('/api/beilagen', brauchtRolle(['admin', 'verwaltung']), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  antwort.json(db.prepare('SELECT * FROM beilage WHERE geloescht = 0 ORDER BY name').all());
});

router.post('/api/beilagen', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const name = String(anfrage.body.name || '').trim();
  if (name === '') {
    return antwort.status(400).json({ fehler: 'Bitte einen Namen für die Beilage angeben.' });
  }
  const nameTr = normalisiereNameTr(anfrage.body.name_tr);
  const ergebnis = db.prepare('INSERT INTO beilage (name, name_tr) VALUES (?, ?)').run(name, nameTr);
  sendeEreignis('beilagen');
  antwort.json(db.prepare('SELECT * FROM beilage WHERE id = ?').get(ergebnis.lastInsertRowid));
});

router.put('/api/beilagen/:id', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
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
  const nameTr = 'name_tr' in anfrage.body
    ? normalisiereNameTr(anfrage.body.name_tr)
    : vorhanden.name_tr;
  db.prepare('UPDATE beilage SET name = ?, name_tr = ?, aktiv = ? WHERE id = ?')
    .run(name, nameTr, aktiv, vorhanden.id);
  sendeEreignis('beilagen');
  antwort.json(db.prepare('SELECT * FROM beilage WHERE id = ?').get(vorhanden.id));
});

router.delete('/api/beilagen/:id', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  db.prepare('UPDATE beilage SET geloescht = 1, aktiv = 0 WHERE id = ?').run(anfrage.params.id);
  sendeEreignis('beilagen');
  antwort.json({ ok: true });
});

export default router;
