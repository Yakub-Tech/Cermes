import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { datenVerzeichnis } from '../src/db.js';

function backupHolen(agent) {
  return agent.get('/api/backup').buffer().parse((antwort, weiter) => {
    const teile = [];
    antwort.on('data', (teil) => teile.push(teil));
    antwort.on('end', () => weiter(null, Buffer.concat(teile)));
  });
}

test('Backup einspielen: scheitert das Protokollieren, kommt eine deutsche Fehlerantwort statt eines Absturzes',
  { timeout: 20000 }, async () => {
    const { app, db } = frischeApp();
    db.exec('DROP TRIGGER IF EXISTS test_kein_audit_insert');
    const admin = await angemeldeterAgent(app, db, 'admin');
    await admin.post('/api/artikel').send({
      name: 'Vorher', farbe: '#f5c211', preis_cent: 100, beilagen_ids: [], sortierung: 1,
    });
    const backup = await backupHolen(admin);

    db.exec(`CREATE TRIGGER test_kein_audit_insert BEFORE INSERT ON audit_eintrag
      BEGIN SELECT RAISE(ABORT, 'Testfehler: Datenträger voll'); END;`);
    try {
      const antwort = await admin.post('/api/backup/einspielen').attach('backup', backup.body, 'x.zip');
      assert.equal(antwort.status, 500);
      assert.match(antwort.body.fehler, /Backup/);
      assert.doesNotMatch(antwort.body.fehler, /Error|SQLITE|undefined/);
    } finally {
      db.exec('DROP TRIGGER IF EXISTS test_kein_audit_insert');
      fs.rmSync(path.join(datenVerzeichnis(), 'cermes.sqlite.vor-einspielen'), { force: true });
    }
  });

test('Backup einspielen: scheitert die Sicherungskopie, kommt eine deutsche Fehlerantwort statt eines Absturzes',
  { timeout: 20000 }, async (t) => {
    const { app, db } = frischeApp();
    db.exec('DROP TRIGGER IF EXISTS test_kein_audit_insert');
    const admin = await angemeldeterAgent(app, db, 'admin');
    await admin.post('/api/artikel').send({
      name: 'Vorher', farbe: '#f5c211', preis_cent: 100, beilagen_ids: [], sortierung: 1,
    });
    const backup = await backupHolen(admin);

    t.mock.method(fs, 'copyFileSync', () => {
      throw new Error('Testfehler: Datenträger voll');
    });
    try {
      const antwort = await admin.post('/api/backup/einspielen').attach('backup', backup.body, 'x.zip');
      assert.equal(antwort.status, 500);
      assert.match(antwort.body.fehler, /Backup/);
      assert.doesNotMatch(antwort.body.fehler, /Error|undefined/);
    } finally {
      t.mock.reset();
      fs.rmSync(path.join(datenVerzeichnis(), 'cermes.sqlite.vor-einspielen'), { force: true });
    }
  });

test('Backup herunterladen: scheitert das Protokollieren, kommt eine deutsche Fehlerantwort statt einer englischen Stacktrace-Seite', async (t) => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  db.exec(`CREATE TRIGGER test_kein_audit_insert BEFORE INSERT ON audit_eintrag
    BEGIN SELECT RAISE(ABORT, 'Testfehler: Datenträger voll'); END;`);
  try {
    const antwort = await admin.get('/api/backup');
    assert.equal(antwort.status, 500);
    assert.match(antwort.body.fehler, /Backup/);
    assert.doesNotMatch(antwort.text ?? '', /<html/);
  } finally {
    db.exec('DROP TRIGGER IF EXISTS test_kein_audit_insert');
  }
});
