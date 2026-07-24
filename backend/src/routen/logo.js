import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const platzhalterPfad = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'assets', 'logo_platzhalter.png'
);

function logoOrdner() {
  const ordner = path.join(datenVerzeichnis(), 'logo');
  fs.mkdirSync(ordner, { recursive: true });
  return ordner;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function nurDiesesAktivieren(db, id) {
  db.transaction(() => {
    db.prepare('UPDATE logo SET aktiv = 0').run();
    db.prepare('UPDATE logo SET aktiv = 1 WHERE id = ?').run(id);
  })();
}

router.get('/api/logo', brauchtRolle('admin'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const logos = db.prepare('SELECT * FROM logo ORDER BY id').all();
  antwort.json(logos.map((logo) => ({ ...logo, url: `/logo/${logo.dateiname}` })));
});

router.post('/api/logo', brauchtRolle('admin'), upload.single('logo'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  if (!anfrage.file) {
    return antwort.status(400).json({ fehler: 'Bitte eine Bilddatei auswählen.' });
  }
  const endung = erlaubteTypen[anfrage.file.mimetype];
  if (!endung) {
    return antwort.status(400).json({ fehler: 'Nur Bilder im Format PNG, JPEG oder WebP sind erlaubt.' });
  }
  const dateiname = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${endung}`;
  fs.writeFileSync(path.join(logoOrdner(), dateiname), anfrage.file.buffer);
  const ergebnis = db.prepare(
    'INSERT INTO logo (dateiname, aktiv, hochgeladen_am) VALUES (?, 0, ?)'
  ).run(dateiname, jetztIso());
  nurDiesesAktivieren(db, ergebnis.lastInsertRowid);
  const logo = db.prepare('SELECT * FROM logo WHERE id = ?').get(ergebnis.lastInsertRowid);
  sendeEreignis('logo');
  antwort.json({ ...logo, url: `/logo/${logo.dateiname}` });
});

router.put('/api/logo/:id', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const logo = db.prepare('SELECT * FROM logo WHERE id = ?').get(anfrage.params.id);
  if (!logo) {
    return antwort.status(404).json({ fehler: 'Dieses Logo gibt es nicht mehr.' });
  }
  if (anfrage.body.aktiv) {
    nurDiesesAktivieren(db, logo.id);
  } else {
    db.prepare('UPDATE logo SET aktiv = 0 WHERE id = ?').run(logo.id);
  }
  sendeEreignis('logo');
  antwort.json({ ok: true });
});

router.delete('/api/logo/:id', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const logo = db.prepare('SELECT * FROM logo WHERE id = ?').get(anfrage.params.id);
  if (!logo) {
    return antwort.status(404).json({ fehler: 'Dieses Logo gibt es nicht mehr.' });
  }
  const datei = path.join(logoOrdner(), logo.dateiname);
  if (fs.existsSync(datei)) fs.unlinkSync(datei);
  db.prepare('DELETE FROM logo WHERE id = ?').run(logo.id);
  sendeEreignis('logo');
  antwort.json({ ok: true });
});

router.get('/logo/aktuell', (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const aktives = db.prepare('SELECT * FROM logo WHERE aktiv = 1').get();
  antwort.set('Cache-Control', 'no-store');
  if (aktives) {
    return antwort.sendFile(path.join(logoOrdner(), aktives.dateiname));
  }
  antwort.sendFile(platzhalterPfad);
});

export { logoOrdner };
export default router;
