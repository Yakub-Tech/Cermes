import express from 'express';
import archiver from 'archiver';
import multer from 'multer';
import unzipper from 'unzipper';
import fs from 'node:fs';
import path from 'node:path';
import { oeffneDatenbank, schliesseDatenbank, datenVerzeichnis } from '../db.js';
import { heutigesDatum } from '../zeit.js';
import { brauchtRolle } from '../auth.js';
import { protokolliere } from '../audit.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

let einspielenLaeuft = false;

export function backupWirdEingespielt() {
  return einspielenLaeuft;
}

export function testSperreSetzen(wert) {
  einspielenLaeuft = wert;
}

let prozessNeustart = () => process.exit(0);

export function testNeustartFunktionSetzen(funktion) {
  prozessNeustart = funktion;
}

export function neustartRegistrieren(antwort) {
  let ausgeloest = false;
  function einmalig() {
    if (ausgeloest) return;
    ausgeloest = true;
    prozessNeustart();
  }
  if (antwort.destroyed) {
    einmalig();
  } else {
    antwort.on('finish', einmalig);
    antwort.on('close', einmalig);
  }
}

router.get('/api/backup', brauchtRolle('admin'), (anfrage, antwort) => {
  const db = oeffneDatenbank();
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    protokolliere(db, anfrage.benutzer, 'backup', 'backup_heruntergeladen');
  } catch {
    return antwort.status(500).json({ fehler: 'Das Backup konnte nicht erstellt werden. Bitte noch einmal versuchen.' });
  }

  antwort.setHeader('Content-Type', 'application/zip');
  antwort.setHeader('Content-Disposition',
    `attachment; filename="cermes-backup-${heutigesDatum()}.zip"`);

  const zip = archiver('zip');
  zip.pipe(antwort);
  zip.file(path.join(datenVerzeichnis(), 'cermes.sqlite'), { name: 'cermes.sqlite' });
  const werbeOrdner = path.join(datenVerzeichnis(), 'werbung');
  if (fs.existsSync(werbeOrdner)) {
    zip.directory(werbeOrdner, 'werbung');
  }
  zip.finalize();
});

router.post('/api/backup/einspielen', brauchtRolle('admin'), upload.single('backup'),
  async (anfrage, antwort) => {
    if (einspielenLaeuft) {
      return antwort.status(503).json({
        fehler: 'Gerade wird ein Backup eingespielt. Bitte kurz warten und es dann noch einmal versuchen.',
      });
    }
    einspielenLaeuft = true;
    try {
      if (!anfrage.file) {
        return antwort.status(400).json({ fehler: 'Bitte eine Backup-Datei (ZIP) auswählen.' });
      }
      let zip;
      try {
        zip = await unzipper.Open.buffer(anfrage.file.buffer);
      } catch {
        return antwort.status(400).json({ fehler: 'Diese Datei ist kein lesbares ZIP-Backup.' });
      }
      if (!zip.files.some((eintrag) => eintrag.path === 'cermes.sqlite')) {
        return antwort.status(400).json({ fehler: 'In diesem ZIP fehlt die Datenbankdatei cermes.sqlite. Das ist kein Cermes-Backup.' });
      }

      const db = oeffneDatenbank();
      protokolliere(db, anfrage.benutzer, 'backup', 'backup_eingespielt');

      db.pragma('wal_checkpoint(TRUNCATE)');
      schliesseDatenbank();

      const dbDatei = path.join(datenVerzeichnis(), 'cermes.sqlite');
      if (fs.existsSync(dbDatei)) {
        fs.copyFileSync(dbDatei, `${dbDatei}.vor-einspielen`);
      }

      try {
        for (const eintrag of zip.files) {
          if (eintrag.type !== 'File') continue;
          const ziel = path.join(datenVerzeichnis(), eintrag.path);
          if (!ziel.startsWith(path.resolve(datenVerzeichnis()) + path.sep)) continue;
          fs.mkdirSync(path.dirname(ziel), { recursive: true });
          fs.writeFileSync(ziel, await eintrag.buffer());
        }
      } catch {
        if (fs.existsSync(`${dbDatei}.vor-einspielen`)) {
          fs.copyFileSync(`${dbDatei}.vor-einspielen`, dbDatei);
        }
        return antwort.status(500).json({
          fehler: 'Das Backup konnte nicht vollständig eingespielt werden. Der bisherige Stand wurde wiederhergestellt. Bitte Cermes neu starten und es noch einmal versuchen.',
        });
      }

      neustartRegistrieren(antwort);
      antwort.json({ hinweis: 'Backup eingespielt. Cermes startet jetzt automatisch neu, das dauert ein paar Sekunden.' });
    } catch {
      antwort.status(500).json({
        fehler: 'Das Backup konnte nicht eingespielt werden. Der bisherige Stand ist unverändert. Bitte Cermes neu starten und es noch einmal versuchen.',
      });
    } finally {
      einspielenLaeuft = false;
    }
  });

export default router;
