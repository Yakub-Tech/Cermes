import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { frischeApp, angemeldeterAgent } from './helfer.js';

const GUELTIGES_MINI_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function mitScheiterndemAuditSchreiben(db, tuWaehrenddessen) {
  db.exec(`CREATE TRIGGER test_audit_scheitert BEFORE INSERT ON audit_eintrag
    BEGIN SELECT RAISE(ABORT, 'Testfehler: Datenträger voll'); END;`);
  try {
    return await tuWaehrenddessen();
  } finally {
    db.exec('DROP TRIGGER test_audit_scheitert');
  }
}

test('Werbebild löschen: scheitert die Datenbank, bleibt die Datei erhalten', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const bild = (await admin.post('/api/werbung').attach('bild', GUELTIGES_MINI_PNG, 'test.png')).body;
  const werbeOrdner = path.join(process.env.DATEN_VERZEICHNIS, 'werbung');
  assert.equal(fs.readdirSync(werbeOrdner).length, 1);

  await mitScheiterndemAuditSchreiben(db, async () => {
    const antwort = await admin.delete(`/api/werbung/${bild.id}`);
    assert.equal(antwort.status, 500);
  });

  assert.equal(fs.readdirSync(werbeOrdner).length, 1, 'Datei bleibt liegen, solange der Datenbank-Eintrag noch existiert');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM werbebild').get().n, 1);
});

test('Logo löschen: scheitert die Datenbank, bleibt die Datei erhalten', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const logo = (await admin.post('/api/logo').attach('logo', GUELTIGES_MINI_PNG, 'test.png')).body;
  const logoOrdner = path.join(process.env.DATEN_VERZEICHNIS, 'logo');
  assert.equal(fs.readdirSync(logoOrdner).length, 1);

  await mitScheiterndemAuditSchreiben(db, async () => {
    const antwort = await admin.delete(`/api/logo/${logo.id}`);
    assert.equal(antwort.status, 500);
  });

  assert.equal(fs.readdirSync(logoOrdner).length, 1, 'Datei bleibt liegen, solange der Datenbank-Eintrag noch existiert');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM logo').get().n, 1);
});

test('Artikelbild entfernen: scheitert die Datenbank, bleibt die Datei erhalten', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Testartikel', farbe: '#f5c211', preis_cent: 100, beilagen_ids: [], sortierung: 1,
  })).body;
  await admin.post(`/api/artikel/${artikel.id}/bild`).attach('bild', GUELTIGES_MINI_PNG, 'test.png');
  const bilderOrdner = path.join(process.env.DATEN_VERZEICHNIS, 'artikelbilder');
  assert.equal(fs.readdirSync(bilderOrdner).length, 1);

  await mitScheiterndemAuditSchreiben(db, async () => {
    const antwort = await admin.delete(`/api/artikel/${artikel.id}/bild`);
    assert.equal(antwort.status, 500);
  });

  assert.equal(fs.readdirSync(bilderOrdner).length, 1, 'Datei bleibt liegen, solange die Datenbank noch auf sie verweist');
  const geladen = db.prepare('SELECT bild_dateiname FROM artikel WHERE id = ?').get(artikel.id);
  assert.ok(geladen.bild_dateiname, 'Datenbank-Verweis ist noch da, weil das Löschen zurückgerollt wurde');
});
