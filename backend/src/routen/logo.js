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
import { verkleinereLogo } from '../bildkompression.js';
import { protokolliere, protokolliereAenderung, unterschiede } from '../audit.js';

const router = express.Router();

const UNERWARTETER_FEHLER = 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.';

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

router.get('/api/logo', brauchtRolle(['admin', 'verwaltung']), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const logos = db.prepare('SELECT * FROM logo ORDER BY id').all();
  antwort.json(logos.map((logo) => ({ ...logo, url: `/logo/${logo.dateiname}` })));
});

router.post('/api/logo', brauchtRolle(['admin', 'verwaltung']), upload.single('logo'), async (anfrage, antwort) => {
  const db = oeffneDatenbank();
  if (!anfrage.file) {
    return antwort.status(400).json({ fehler: 'Bitte eine Bilddatei auswählen.' });
  }
  const endung = erlaubteTypen[anfrage.file.mimetype];
  if (!endung) {
    return antwort.status(400).json({ fehler: 'Nur Bilder im Format PNG, JPEG oder WebP sind erlaubt.' });
  }
  let verkleinert;
  try {
    verkleinert = await verkleinereLogo(anfrage.file.buffer);
  } catch {
    return antwort.status(400).json({ fehler: 'Diese Datei scheint kein gültiges Bild zu sein.' });
  }
  const dateiname = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${endung}`;
  try {
    fs.writeFileSync(path.join(logoOrdner(), dateiname), verkleinert);
    const logo = db.transaction(() => {
      const ergebnis = db.prepare(
        'INSERT INTO logo (dateiname, aktiv, hochgeladen_am) VALUES (?, 0, ?)'
      ).run(dateiname, jetztIso());
      nurDiesesAktivieren(db, ergebnis.lastInsertRowid);
      protokolliere(db, anfrage.benutzer, 'bilder', 'logo_hochgeladen', { werte: { datei: dateiname } });
      return db.prepare('SELECT * FROM logo WHERE id = ?').get(ergebnis.lastInsertRowid);
    })();
    sendeEreignis('logo');
    antwort.json({ ...logo, url: `/logo/${logo.dateiname}` });
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

router.put('/api/logo/:id', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const logo = db.prepare('SELECT * FROM logo WHERE id = ?').get(anfrage.params.id);
  if (!logo) {
    return antwort.status(404).json({ fehler: 'Dieses Logo gibt es nicht mehr.' });
  }
  const neuAktiv = anfrage.body.aktiv ? 1 : 0;
  try {
    db.transaction(() => {
      if (neuAktiv) {
        nurDiesesAktivieren(db, logo.id);
      } else {
        db.prepare('UPDATE logo SET aktiv = 0 WHERE id = ?').run(logo.id);
      }
      protokolliereAenderung(db, anfrage.benutzer, 'bilder', 'logo', { datei: logo.dateiname },
        unterschiede(logo, { aktiv: neuAktiv }, ['aktiv']));
    })();
    sendeEreignis('logo');
    antwort.json({ ok: true });
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

router.delete('/api/logo/:id', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const logo = db.prepare('SELECT * FROM logo WHERE id = ?').get(anfrage.params.id);
  if (!logo) {
    return antwort.status(404).json({ fehler: 'Dieses Logo gibt es nicht mehr.' });
  }
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM logo WHERE id = ?').run(logo.id);
      protokolliere(db, anfrage.benutzer, 'bilder', 'logo_entfernt', { werte: { datei: logo.dateiname } });
    })();
  } catch {
    return antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
  try {
    const datei = path.join(logoOrdner(), logo.dateiname);
    if (fs.existsSync(datei)) fs.unlinkSync(datei);
  } catch {
  }
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
