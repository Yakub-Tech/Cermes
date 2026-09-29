import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import sharp from 'sharp';
import { frischeApp, angemeldeterAgent } from './helfer.js';

const GUELTIGES_MINI_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function logoHochladen(agent) {
  return agent.post('/api/logo').attach('logo', GUELTIGES_MINI_PNG, 'logo.png');
}

function gespeichertesLogo(logo) {
  return fs.readFileSync(path.join(process.env.DATEN_VERZEICHNIS, 'logo', logo.dateiname));
}

test('Logo: großes PNG wird auf höchstens 512 Pixel verkleinert, bleibt PNG und behält die Transparenz', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const gross = await sharp({
    create: { width: 3000, height: 2000, channels: 4, background: { r: 122, g: 26, b: 47, alpha: 0.5 } },
  }).png().toBuffer();

  const logo = (await admin.post('/api/logo').attach('logo', gross, 'logo.png')).body;
  const info = await sharp(gespeichertesLogo(logo)).metadata();
  assert.equal(info.format, 'png');
  assert.equal(info.width, 512);
  assert.equal(info.height, 341);
  assert.equal(info.hasAlpha, true);
  assert.ok(logo.dateiname.endsWith('.png'));
  await admin.delete(`/api/logo/${logo.id}`);
});

test('Logo: JPEG bleibt JPEG, kleine Logos werden nicht vergrößert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const klein = await sharp({
    create: { width: 200, height: 100, channels: 3, background: '#f5c211' },
  }).jpeg().toBuffer();

  const logo = (await admin.post('/api/logo').attach('logo', klein, 'logo.jpg')).body;
  const info = await sharp(gespeichertesLogo(logo)).metadata();
  assert.equal(info.format, 'jpeg');
  assert.equal(info.width, 200);
  assert.ok(logo.dateiname.endsWith('.jpg'));
  await admin.delete(`/api/logo/${logo.id}`);
});

test('Logo: eine Datei, die nur vorgibt ein Bild zu sein, wird verständlich abgelehnt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const antwort = await admin.post('/api/logo')
    .attach('logo', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'logo.png', contentType: 'image/png' });
  assert.equal(antwort.status, 400);
  assert.equal(antwort.body.fehler, 'Diese Datei scheint kein gültiges Bild zu sein.');
  assert.equal((await admin.get('/api/logo')).body.length, 0);
});

test('Logo: ohne Upload liefert /logo/aktuell den Platzhalter', async () => {
  const { app } = frischeApp();
  const antwort = await request(app).get('/logo/aktuell');
  assert.equal(antwort.status, 200);
  const platzhalter = fs.readFileSync(path.resolve('..', 'assets', 'logo_platzhalter.png'));
  assert.ok(antwort.body.equals(platzhalter));
});

test('Logo: Upload aktiviert automatisch und deaktiviert das vorherige aktive Logo', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  const erstes = (await logoHochladen(admin)).body;
  assert.equal(erstes.aktiv, 1);

  const zweites = (await logoHochladen(admin)).body;
  assert.equal(zweites.aktiv, 1);

  const liste = (await admin.get('/api/logo')).body;
  const ersteZeile = liste.find((l) => l.id === erstes.id);
  assert.equal(ersteZeile.aktiv, 0);

  const aktuell = await request(app).get('/logo/aktuell');
  const erwartet = fs.readFileSync(path.join(process.env.DATEN_VERZEICHNIS, 'logo', zweites.dateiname));
  assert.ok(aktuell.body.equals(erwartet));

  await admin.delete(`/api/logo/${erstes.id}`);
  await admin.delete(`/api/logo/${zweites.id}`);
});

test('Logo: manuelles Aktivieren deaktiviert alle anderen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const erstes = (await logoHochladen(admin)).body;
  const zweites = (await logoHochladen(admin)).body;

  await admin.put(`/api/logo/${erstes.id}`).send({ aktiv: true });
  const liste = (await admin.get('/api/logo')).body;
  assert.equal(liste.find((l) => l.id === erstes.id).aktiv, 1);
  assert.equal(liste.find((l) => l.id === zweites.id).aktiv, 0);

  await admin.delete(`/api/logo/${erstes.id}`);
  await admin.delete(`/api/logo/${zweites.id}`);
});

test('Logo: Deaktivieren des aktiven Logos lässt /logo/aktuell auf den Platzhalter zurückfallen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const logo = (await logoHochladen(admin)).body;

  await admin.put(`/api/logo/${logo.id}`).send({ aktiv: false });
  const antwort = await request(app).get('/logo/aktuell');
  const platzhalter = fs.readFileSync(path.resolve('..', 'assets', 'logo_platzhalter.png'));
  assert.ok(antwort.body.equals(platzhalter));

  await admin.delete(`/api/logo/${logo.id}`);
});

test('Logo: Löschen entfernt Datei und Zeile, aktives Logo fällt danach auf Platzhalter zurück', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const logo = (await logoHochladen(admin)).body;

  await admin.delete(`/api/logo/${logo.id}`);
  assert.equal((await admin.get('/api/logo')).body.length, 0);
  const logoOrdner = path.join(process.env.DATEN_VERZEICHNIS, 'logo');
  assert.equal(fs.readdirSync(logoOrdner).length, 0);

  const antwort = await request(app).get('/logo/aktuell');
  const platzhalter = fs.readFileSync(path.resolve('..', 'assets', 'logo_platzhalter.png'));
  assert.ok(antwort.body.equals(platzhalter));
});

test('Logo: falscher Dateityp wird abgelehnt', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const antwort = await admin.post('/api/logo')
    .attach('logo', Buffer.from('kein bild'), { filename: 'test.txt', contentType: 'text/plain' });
  assert.equal(antwort.status, 400);
});

test('Logo: Rollenschutz: nur admin darf verwalten, /logo/aktuell ist öffentlich', async () => {
  const { app, db } = frischeApp();
  assert.equal((await request(app).get('/api/logo')).status, 401);
  assert.equal((await request(app).get('/logo/aktuell')).status, 200);

  const kasse = await angemeldeterAgent(app, db, 'kasse');
  assert.equal((await kasse.get('/api/logo')).status, 403);
  assert.equal((await kasse.post('/api/logo')).status, 403);
});

test('Logo: unbekannte ID liefert 404', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  assert.equal((await admin.put('/api/logo/9999').send({ aktiv: true })).status, 404);
  assert.equal((await admin.delete('/api/logo/9999')).status, 404);
});
