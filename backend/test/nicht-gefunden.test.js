import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp } from './helfer.js';

test('Unbekannter API-Pfad liefert 404 mit deutscher Fehlermeldung als JSON', async () => {
  const { app } = frischeApp();
  const antwort = await request(app).get('/api/gibt-es-nicht');
  assert.equal(antwort.status, 404);
  assert.equal(antwort.body.fehler, 'Diese Adresse gibt es nicht.');
});

test('Unbekannte Bilddatei liefert 404 mit deutscher Fehlermeldung statt Express-Standardtext', async () => {
  const { app } = frischeApp();
  const antwort = await request(app).get('/artikelbilder/gibt-es-nicht.jpg');
  assert.equal(antwort.status, 404);
  assert.equal(antwort.body.fehler, 'Diese Adresse gibt es nicht.');
});
