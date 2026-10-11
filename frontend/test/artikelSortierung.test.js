import { test } from 'node:test';
import assert from 'node:assert/strict';
import { artikelSortieren } from '../src/admin/artikelSortierung.js';

const artikel = [
  { artikel_name: 'Öl', stueck: 5, umsatz_cent: 500 },
  { artikel_name: 'Bratwurst', stueck: 20, umsatz_cent: 4000 },
  { artikel_name: 'Zwiebeln', stueck: 10, umsatz_cent: 1000 },
];

test('alphabetisch sortiert nach Artikelname inkl. äöü in deutscher Reihenfolge', () => {
  const ergebnis = artikelSortieren(artikel, 'alphabetisch', 'stueck');
  assert.deepEqual(ergebnis.map((a) => a.artikel_name), ['Bratwurst', 'Öl', 'Zwiebeln']);
});

test('aufsteigend sortiert nach dem übergebenen Wertschlüssel', () => {
  const ergebnis = artikelSortieren(artikel, 'aufsteigend', 'stueck');
  assert.deepEqual(ergebnis.map((a) => a.stueck), [5, 10, 20]);
});

test('absteigend sortiert nach dem übergebenen Wertschlüssel', () => {
  const ergebnis = artikelSortieren(artikel, 'absteigend', 'umsatz_cent');
  assert.deepEqual(ergebnis.map((a) => a.umsatz_cent), [4000, 1000, 500]);
});

test('verändert das übergebene Array nicht', () => {
  const kopie = [...artikel];
  artikelSortieren(artikel, 'aufsteigend', 'stueck');
  assert.deepEqual(artikel, kopie);
});
