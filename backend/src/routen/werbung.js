import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { oeffneDatenbank, datenVerzeichnis } from '../db.js';
import { jetztIso } from '../zeit.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';

const router = express.Router();

const erlaubteTypen = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function werbeOrdner() {
  const ordner = path.join(datenVerzeichnis(), 'werbung');
  fs.mkdirSync(ordner, { recursive: true });
  return ordner;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/api/werbung', brauchtRolle('admin'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const bilder = db.prepare('SELECT * FROM werbebild ORDER BY id').all();
  antwort.json(bilder.map((bild) => ({ ...bild, url: `/werbung/${bild.dateiname}` })));
});

router.post('/api/werbung', brauchtRolle('admin'), upload.single('bild'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  if (!anfrage.file) {
    return antwort.status(400).json({ fehler: 'Bitte eine Bilddatei auswählen.' });
  }
  const endung = erlaubteTypen[anfrage.file.mimetype];
  if (!endung) {
    return antwort.status(400).json({ fehler: 'Nur Bilder im Format PNG, JPEG oder WebP sind erlaubt.' });
  }
  const dateiname = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${endung}`;
  fs.writeFileSync(path.join(werbeOrdner(), dateiname), anfrage.file.buffer);
  const ergebnis = db.prepare(
    'INSERT INTO werbebild (dateiname, hochgeladen_am) VALUES (?, ?)'
  ).run(dateiname, jetztIso());
  const bild = db.prepare('SELECT * FROM werbebild WHERE id = ?').get(ergebnis.lastInsertRowid);
  sendeEreignis('werbung');
  antwort.json({ ...bild, url: `/werbung/${bild.dateiname}` });
});

router.put('/api/werbung/:id', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const aktiv = anfrage.body.aktiv ? 1 : 0;
  const ergebnis = db.prepare('UPDATE werbebild SET aktiv = ? WHERE id = ?')
    .run(aktiv, anfrage.params.id);
  if (ergebnis.changes === 0) {
    return antwort.status(404).json({ fehler: 'Dieses Werbebild gibt es nicht mehr.' });
  }
  sendeEreignis('werbung');
  antwort.json({ ok: true });
});

router.delete('/api/werbung/:id', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const bild = db.prepare('SELECT * FROM werbebild WHERE id = ?').get(anfrage.params.id);
  if (!bild) {
    return antwort.status(404).json({ fehler: 'Dieses Werbebild gibt es nicht mehr.' });
  }
  const datei = path.join(werbeOrdner(), bild.dateiname);
  if (fs.existsSync(datei)) fs.unlinkSync(datei);
  db.prepare('DELETE FROM werbebild WHERE id = ?').run(bild.id);
  sendeEreignis('werbung');
  antwort.json({ ok: true });
});

export { werbeOrdner };
export default router;
