import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import bcrypt from 'bcryptjs';

process.env.DATEN_VERZEICHNIS = fs.mkdtempSync(path.join(os.tmpdir(), 'cermes-test-'));

const { oeffneDatenbank } = await import('../src/db.js');
const { erstelleApp } = await import('../src/server.js');

export function frischeApp() {
  const db = oeffneDatenbank();
  db.exec(`DELETE FROM kaertchen; DELETE FROM kassiervorgang;
    DELETE FROM artikel_beilage; DELETE FROM beilage; DELETE FROM artikel;
    DELETE FROM werbebild; DELETE FROM logo; DELETE FROM benutzer;`);
  return { app: erstelleApp(), db };
}

export async function angemeldeterAgent(app, db, rolle) {
  const name = `test-${rolle}`;
  db.prepare('INSERT OR IGNORE INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)')
    .run(name, bcrypt.hashSync('geheim', 4), rolle, '2026-01-01T00:00:00');
  const agent = request.agent(app);
  await agent.post('/api/login').send({ benutzername: name, passwort: 'geheim' });
  return agent;
}
