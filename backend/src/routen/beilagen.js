import express from 'express';
import { oeffneDatenbank } from '../db.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';
import { protokolliere, protokolliereAenderung, unterschiede } from '../audit.js';

const router = express.Router();

const UNERWARTETER_FEHLER = 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.';

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
  try {
    const anlegen = db.transaction(() => {
      const ergebnis = db.prepare('INSERT INTO beilage (name, name_tr) VALUES (?, ?)').run(name, nameTr);
      protokolliere(db, anfrage.benutzer, 'artikel', 'beilage_angelegt', {
        werte: { beilage: name, name_tr: nameTr },
      });
      return ergebnis.lastInsertRowid;
    });
    antwort.json(db.prepare('SELECT * FROM beilage WHERE id = ?').get(anlegen()));
    sendeEreignis('beilagen');
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
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
  try {
    const aendern = db.transaction(() => {
      db.prepare('UPDATE beilage SET name = ?, name_tr = ?, aktiv = ? WHERE id = ?')
        .run(name, nameTr, aktiv, vorhanden.id);
      protokolliereAenderung(db, anfrage.benutzer, 'artikel', 'beilage', { beilage: name },
        unterschiede(vorhanden, { name, name_tr: nameTr, aktiv }, ['name', 'name_tr', 'aktiv']));
    });
    aendern();
    antwort.json(db.prepare('SELECT * FROM beilage WHERE id = ?').get(vorhanden.id));
    sendeEreignis('beilagen');
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

router.delete('/api/beilagen/:id', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  try {
    const loeschen = db.transaction(() => {
      const beilage = db.prepare('SELECT * FROM beilage WHERE id = ? AND geloescht = 0').get(anfrage.params.id);
      if (!beilage) return;
      db.prepare('UPDATE beilage SET geloescht = 1, aktiv = 0 WHERE id = ?').run(beilage.id);
      protokolliere(db, anfrage.benutzer, 'artikel', 'beilage_geloescht', { werte: { beilage: beilage.name } });
    });
    loeschen();
    antwort.json({ ok: true });
    sendeEreignis('beilagen');
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

export default router;
