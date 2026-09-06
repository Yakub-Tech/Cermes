import express from 'express';
import archiver from 'archiver';
import multer from 'multer';
import unzipper from 'unzipper';
import fs from 'node:fs';
import path from 'node:path';
import { oeffneDatenbank, datenVerzeichnis } from '../db.js';
import { heutigesDatum } from '../zeit.js';
import { brauchtRolle } from '../auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

router.get('/api/backup', brauchtRolle('admin'), (_anfrage, antwort) => {
  const db = oeffneDatenbank();
  db.pragma('wal_checkpoint(TRUNCATE)');

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

    const dbDatei = path.join(datenVerzeichnis(), 'cermes.sqlite');
    if (fs.existsSync(dbDatei)) {
      fs.copyFileSync(dbDatei, `${dbDatei}.vor-einspielen`);
    }

    for (const eintrag of zip.files) {
      if (eintrag.type !== 'File') continue;
      const ziel = path.join(datenVerzeichnis(), eintrag.path);
      if (!ziel.startsWith(path.resolve(datenVerzeichnis()) + path.sep)) continue;
      fs.mkdirSync(path.dirname(ziel), { recursive: true });
      fs.writeFileSync(ziel, await eintrag.buffer());
    }

    antwort.json({ hinweis: 'Backup eingespielt. Bitte Cermes neu starten (docker compose restart).' });
  });

export default router;
