import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { oeffneDatenbank, datenVerzeichnis } from '../db.js';
import { brauchtRolle } from '../auth.js';
import { sendeEreignis } from '../broadcast.js';
import { komprimiereBild } from '../bildkompression.js';
import { artikelMitDetails, ohneKosten } from './artikel.js';
import { protokolliere } from '../audit.js';

const router = express.Router();

const UNERWARTETER_FEHLER = 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.';

const erlaubteBildTypen = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function artikelBilderOrdner() {
  const ordner = path.join(datenVerzeichnis(), 'artikelbilder');
  fs.mkdirSync(ordner, { recursive: true });
  return ordner;
}

const bildUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/api/artikel/:id/bild', brauchtRolle(['admin', 'verwaltung']),
  bildUpload.single('bild'), async (anfrage, antwort) => {
    const db = oeffneDatenbank();
    const vorhanden = db.prepare('SELECT * FROM artikel WHERE id = ? AND geloescht = 0')
      .get(anfrage.params.id);
    if (!vorhanden) {
      return antwort.status(404).json({ fehler: 'Dieser Artikel existiert nicht mehr.' });
    }
    if (!anfrage.file) {
      return antwort.status(400).json({ fehler: 'Bitte eine Bilddatei auswählen.' });
    }
    if (!erlaubteBildTypen[anfrage.file.mimetype]) {
      return antwort.status(400).json({ fehler: 'Nur Bilder im Format PNG, JPEG oder WebP sind erlaubt.' });
    }
    let ergebnis;
    try {
      ergebnis = await komprimiereBild(anfrage.file.buffer, anfrage.file.mimetype);
    } catch {
      return antwort.status(400).json({ fehler: 'Diese Datei scheint kein gültiges Bild zu sein.' });
    }
    const dateiname = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ergebnis.endung}`;
    try {
      fs.writeFileSync(path.join(artikelBilderOrdner(), dateiname), ergebnis.puffer);
      db.transaction(() => {
        db.prepare('UPDATE artikel SET bild_dateiname = ? WHERE id = ?').run(dateiname, vorhanden.id);
        protokolliere(db, anfrage.benutzer, 'artikel', 'artikel_bild_gesetzt', { werte: { artikel: vorhanden.name } });
      })();
    } catch {
      return antwort.status(500).json({
        fehler: 'Das Bild konnte nicht gespeichert werden. Bitte prüfen, ob genug Speicherplatz frei ist.',
      });
    }
    if (vorhanden.bild_dateiname) {
      const alteDatei = path.join(artikelBilderOrdner(), vorhanden.bild_dateiname);
      try {
        if (fs.existsSync(alteDatei)) fs.unlinkSync(alteDatei);
      } catch {
      }
    }
    const neu = db.prepare('SELECT * FROM artikel WHERE id = ?').get(vorhanden.id);
    sendeEreignis('artikel');
    const antwortDaten = artikelMitDetails(db, neu);
    antwort.json(anfrage.benutzer.rolle === 'verwaltung' ? ohneKosten(antwortDaten) : antwortDaten);
  });

router.delete('/api/artikel/:id/bild', brauchtRolle(['admin', 'verwaltung']), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  const vorhanden = db.prepare('SELECT * FROM artikel WHERE id = ? AND geloescht = 0')
    .get(anfrage.params.id);
  if (!vorhanden) {
    return antwort.status(404).json({ fehler: 'Dieser Artikel existiert nicht mehr.' });
  }
  try {
    if (vorhanden.bild_dateiname) {
      db.transaction(() => {
        db.prepare('UPDATE artikel SET bild_dateiname = NULL WHERE id = ?').run(vorhanden.id);
        protokolliere(db, anfrage.benutzer, 'artikel', 'artikel_bild_entfernt', { werte: { artikel: vorhanden.name } });
      })();
      try {
        const datei = path.join(artikelBilderOrdner(), vorhanden.bild_dateiname);
        if (fs.existsSync(datei)) fs.unlinkSync(datei);
      } catch {
      }
    }
    sendeEreignis('artikel');
    antwort.json({ ok: true });
  } catch {
    antwort.status(500).json({ fehler: UNERWARTETER_FEHLER });
  }
});

export { artikelBilderOrdner };
export default router;
