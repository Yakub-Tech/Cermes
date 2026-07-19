import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATEN_VERZEICHNIS = fs.mkdtempSync(path.join(os.tmpdir(), 'cermes-test-'));

const { oeffneDatenbank } = await import('../src/db.js');
const { erstelleApp } = await import('../src/server.js');

export function frischeApp() {
  const db = oeffneDatenbank();
  db.exec(`DELETE FROM kaertchen; DELETE FROM kassiervorgang;
    DELETE FROM artikel_beilage; DELETE FROM beilage; DELETE FROM artikel;
    DELETE FROM werbebild; DELETE FROM benutzer;`);
  return { app: erstelleApp(), db };
}
