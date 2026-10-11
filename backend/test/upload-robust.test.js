import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { frischeApp, angemeldeterAgent } from './helfer.js';

async function artikelAnlegen(agent) {
  return (await agent.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 300, beilagen_ids: [], sortierung: 1,
  })).body;
}

test('Upload: gezielt manipulierte Feldnamen beenden den Server nicht', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = await artikelAnlegen(admin);

  const antwort = await admin.post(`/api/artikel/${pommes.id}/bild`)
    .field('items[4294967294]', 'a')
    .field('items[]', 'b');

  assert.ok(antwort.status >= 400 && antwort.status < 600);
  const danach = await admin.get('/api/artikel');
  assert.equal(danach.status, 200);
});

test('Upload: als PNG deklariertes GIF wird abgelehnt und nicht dekodiert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = await artikelAnlegen(admin);
  const gif = await sharp({
    create: { width: 2, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } },
  }).gif().toBuffer();

  const antwort = await admin.post(`/api/artikel/${pommes.id}/bild`)
    .attach('bild', gif, { filename: 'bild.png', contentType: 'image/png' });

  assert.equal(antwort.status, 400);
  assert.match(antwort.body.fehler, /kein gültiges Bild/);
});
