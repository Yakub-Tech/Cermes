import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import express from 'express';
import request from 'supertest';
import { frontendEinbinden } from '../src/statischesFrontend.js';

function tempDistOrdnerAnlegen() {
  const distOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'cermes-dist-'));
  fs.mkdirSync(path.join(distOrdner, 'assets'));
  const jsInhalt = 'console.log("a");'.repeat(200);
  fs.writeFileSync(path.join(distOrdner, 'assets', 'index-ABCDEF.js'), jsInhalt);
  fs.writeFileSync(path.join(distOrdner, 'index.html'), '<html></html>');
  return { distOrdner, jsInhalt };
}

test('gehashte Assets werden bei Accept-Encoding gzip komprimiert ausgeliefert', async () => {
  const { distOrdner, jsInhalt } = tempDistOrdnerAnlegen();
  const app = express();
  frontendEinbinden(app, distOrdner);

  const antwort = await request(app)
    .get('/assets/index-ABCDEF.js')
    .set('Accept-Encoding', 'gzip');

  assert.equal(antwort.status, 200);
  assert.equal(antwort.headers['content-encoding'], 'gzip');
  assert.ok(antwort.headers['content-type'].includes('javascript'));
  assert.ok(Number(antwort.headers['content-length']) < jsInhalt.length);
  assert.equal(antwort.text, jsInhalt);
});

test('ohne Gzip-Unterstützung liefert die Route die unkomprimierte Datei', async () => {
  const { distOrdner, jsInhalt } = tempDistOrdnerAnlegen();
  const app = express();
  frontendEinbinden(app, distOrdner);

  const antwort = await request(app)
    .get('/assets/index-ABCDEF.js')
    .set('Accept-Encoding', 'identity');

  assert.equal(antwort.status, 200);
  assert.equal(antwort.headers['content-encoding'], undefined);
  assert.equal(antwort.text, jsInhalt);
});

test('ein ausdrückliches "gzip;q=0" wird als Ablehnung von Gzip verstanden', async () => {
  const { distOrdner } = tempDistOrdnerAnlegen();
  const app = express();
  frontendEinbinden(app, distOrdner);

  const antwort = await request(app)
    .get('/assets/index-ABCDEF.js')
    .set('Accept-Encoding', 'gzip;q=0, deflate');

  assert.equal(antwort.headers['content-encoding'], undefined);
});

test('gehashte Assets bekommen eine langfristige Cache-Policy, index.html nicht', async () => {
  const { distOrdner } = tempDistOrdnerAnlegen();
  const app = express();
  frontendEinbinden(app, distOrdner);

  const asset = await request(app).get('/assets/index-ABCDEF.js').set('Accept-Encoding', 'identity');
  assert.match(asset.headers['cache-control'], /max-age=31536000/);
  assert.match(asset.headers['cache-control'], /immutable/);

  const html = await request(app).get('/index.html');
  assert.ok(!html.headers['cache-control'] || !html.headers['cache-control'].includes('max-age=31536000'));
});

function rohGet(port, rohPfad, headers) {
  return new Promise((resolve, reject) => {
    const anfrage = http.request({ host: '127.0.0.1', port, method: 'GET', path: rohPfad, headers }, (antwort) => {
      const abschnitte = [];
      antwort.on('data', (abschnitt) => abschnitte.push(abschnitt));
      antwort.on('end', () => resolve({ status: antwort.statusCode, headers: antwort.headers, body: Buffer.concat(abschnitte).toString() }));
    });
    anfrage.on('error', reject);
    anfrage.end();
  });
}

test('kein Zugriff auf .gz-Dateien außerhalb des Asset-Ordners über Pfad-Traversal', async () => {
  const { distOrdner } = tempDistOrdnerAnlegen();
  fs.writeFileSync(path.join(distOrdner, 'geheim.txt.gz'), 'darf nie ausgeliefert werden');

  const app = express();
  frontendEinbinden(app, distOrdner);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;

  try {
    const antwort = await rohGet(port, '/assets/../geheim.txt', { 'Accept-Encoding': 'gzip' });
    assert.notEqual(antwort.headers['content-encoding'], 'gzip');
    assert.ok(!antwort.body.includes('darf nie ausgeliefert werden'));
  } finally {
    server.close();
  }
});
