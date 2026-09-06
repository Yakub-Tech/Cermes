import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp } from './helfer.js';

test('Netzwerkadresse: liefert Adresse aus Umgebungsvariable', async () => {
  process.env.CERMES_HOST_IP = '192.168.1.50';
  const { app } = frischeApp();
  const antwort = await request(app).get('/api/netzwerkadresse');
  assert.equal(antwort.status, 200);
  assert.equal(antwort.body.adresse, '192.168.1.50:8080');
  delete process.env.CERMES_HOST_IP;
});

test('Netzwerkadresse: liefert null ohne Umgebungsvariable', async () => {
  delete process.env.CERMES_HOST_IP;
  const { app } = frischeApp();
  const antwort = await request(app).get('/api/netzwerkadresse');
  assert.equal(antwort.status, 200);
  assert.equal(antwort.body.adresse, null);
});
