import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { oeffneDatenbank, datenVerzeichnis } from '../db.js';
import { jetztIso } from '../zeit.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';
import { komprimiereBild } from '../bildkompression.js';
import { protokolliere, protokolliereAenderung, unterschiede } from '../audit.js';

const router = express.Router();

const UNERWARTETER_FEHLER = 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.';

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

router.get('/api/werbung', brauchtRolle(['admin', 'verwaltung']), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  const bilder = db.prepare('SELECT * FROM werbebild ORDER BY id').all();
  antwort.json(bilder.map((bild) => ({ ...bild, url: `/werbung/${bild.dateiname}` })));
});

router.post('/api/werbung', brauchtRolle(['admin', 'verwaltung']), upload.single('bild'),
  async (anfrage, antwort) => {
    const db = oeffneDatenbank();
    if (!anfrage.file) {
      return antwort.status(400).json({ fehler: 'Bitte eine Bilddatei auswählen.' });
    }
    if (!erlaubteTypen[anfrage.file.mimetype]) {
      return antwort.status(400).json({ fehler: 'Nur Bilder im Format PNG, JPEG oder WebP sind erlaubt.' });
    }
    let ergebnisKompression;
    try {
      ergebnisKompression = await komprimiereBild(anfrage.file.buffer, anfrage.file.mimetype);
    } catch {
      return antwort.status(400).json({ fehler: 'Diese Datei scheint kein gültiges Bild zu sein.' });
    }
    const dateiname = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ergebnisKompression.endung}`;
    let bild;
    try {
      fs.writeFileSync(path.join(werbeOrdner(), dateiname), ergebnisKompression.puffer);
      bild = db.transaction(() => {
        const eingefuegt = db.prepare(
          'INSERT INTO werbebild (dateiname, hochgeladen_am) VALUES (?, ?)'
        ).run(dateiname, jetztIso());
        protokolliere(db, anfrage.benutzer, 'bilder', 'werbebild_hinzugefuegt', { werte: { datei: dateiname } });
        return db.prepare('SELECT * FROM werbebild WHERE id = ?').get(eingefuegt.lastInsertRowid);
      })();
    } catch {
      return antwort.status(500).json({
        fehler: 'Das Bild konnte nicht gespeichert werden. Bitte prüfen, ob genug Speicherplatz frei ist.',
      });
    }
    sendeEreignis('werbung');
    antwort.json({ ...bild, url: `/werbung/${bild.dateiname}` });
  });

router.put('/api/werbung/:id', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const aktiv = anfrage.body.aktiv ? 1 : 0;
  try {
    const aendern = db.transaction(() => {
      const vorhanden = db.prepare('SELECT * FROM werbebild WHERE id = ?').get(anfrage.params.id);
      if (!vorhanden) return false;
      db.prepare('UPDATE werbebild SET aktiv = ? WHERE id = ?').run(aktiv, vorhanden.id);
      protokolliereAenderung(db, anfrage.benutzer, 'bilder', 'werbebild', { datei: vorhanden.dateiname },
        unterschiede(vorhanden, { aktiv }, ['aktiv']));
      return true;
    });
    if (!aendern()) {
      return antwort.status(404).json({ fehler: 'Dieses Werbebild gibt es nicht mehr.' });
    }
    sendeEreignis('werbung');
    antwort.json({ ok: true });
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

router.delete('/api/werbung/:id', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const bild = db.prepare('SELECT * FROM werbebild WHERE id = ?').get(anfrage.params.id);
  if (!bild) {
    return antwort.status(404).json({ fehler: 'Dieses Werbebild gibt es nicht mehr.' });
  }
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM werbebild WHERE id = ?').run(bild.id);
      protokolliere(db, anfrage.benutzer, 'bilder', 'werbebild_entfernt', { werte: { datei: bild.dateiname } });
    })();
  } catch {
    return antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
  try {
    const datei = path.join(werbeOrdner(), bild.dateiname);
    if (fs.existsSync(datei)) fs.unlinkSync(datei);
  } catch {
  }
  sendeEreignis('werbung');
  antwort.json({ ok: true });
});

export { werbeOrdner };
export default router;
