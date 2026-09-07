import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gewinnmargeBerechnen } from '../src/admin/gewinnmarge.js';

test('berechnet die Gewinnmarge in ganzen Prozent', () => {
  const marge = gewinnmargeBerechnen({ umsatz_cent: 10000, gewinn_cent: 4200 });
  assert.equal(marge, 42);
});

test('rundet auf ganze Prozent', () => {
  const marge = gewinnmargeBerechnen({ umsatz_cent: 3000, gewinn_cent: 1000 });
  assert.equal(marge, 33);
});

test('liefert null ohne Umsatz statt Division durch Null', () => {
  const marge = gewinnmargeBerechnen({ umsatz_cent: 0, gewinn_cent: 0 });
  assert.equal(marge, null);
});

test('erlaubt negative Marge, wenn Kosten den Preis übersteigen', () => {
  const marge = gewinnmargeBerechnen({ umsatz_cent: 1000, gewinn_cent: -200 });
  assert.equal(marge, -20);
});
