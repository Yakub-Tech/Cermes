import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortiereFuerFluss } from '../src/tv/gruppierung.js';

test('reiht Kärtchen alphabetisch nach Artikelname gruppiert, danach aufsteigend nach Nummer', () => {
  const kaertchen = [
    { nummer: 5, artikel_name: 'Beyti', artikel_farbe: '#00ff00' },
    { nummer: 1, artikel_name: 'Adana', artikel_farbe: '#ff0000' },
    { nummer: 7, artikel_name: 'Adana', artikel_farbe: '#ff0000' },
    { nummer: 3, artikel_name: 'Pommes', artikel_farbe: '#ffff00' },
  ];

  const ergebnis = sortiereFuerFluss(kaertchen);

  assert.deepEqual(
    ergebnis.map((k) => `${k.artikel_name}-${k.nummer}`),
    ['Adana-1', 'Adana-7', 'Beyti-5', 'Pommes-3']
  );
});

test('liefert eine leere Liste für keine Kärtchen', () => {
  assert.deepEqual(sortiereFuerFluss([]), []);
});
