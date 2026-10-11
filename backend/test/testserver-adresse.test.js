import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp } from './helfer.js';

test('Testserver lauscht nur auf 127.0.0.1, damit kein fremdes Programm Testanfragen abfängt', async () => {
  const { app } = frischeApp();
  assert.equal(app.address().address, '127.0.0.1');

  const antwort = await request(app).get('/api/gesundheit');
  assert.equal(antwort.status, 200);
});
