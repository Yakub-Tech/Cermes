import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offeneMengen } from '../src/belegen/offeneMengen.js';

function karte(artikelName, artikelNameTr, erstelltAm, extra = {}) {
  return { artikel_name: artikelName, artikel_name_tr: artikelNameTr, erstellt_am: erstelltAm, beilagen: [], sonderwunsch: '', ...extra };
}

test('Ohne Kärtchen gibt es keine offenen Mengen', () => {
  assert.deepEqual(offeneMengen([]), []);
});

test('Zählt die Kärtchen je Artikel, Beilagen und Sonderwünsche spielen keine Rolle', () => {
  const kaertchen = [
    karte('Adana', 'Adana', '2026-10-01T12:00:00'),
    karte('Adana', 'Adana', '2026-10-01T12:05:00', { beilagen: ['Zwiebeln'], sonderwunsch: 'scharf' }),
    karte('Pommes', 'Patates', '2026-10-01T12:02:00'),
  ];
  const mengen = offeneMengen(kaertchen);
  assert.deepEqual(mengen.map((m) => [m.artikel_name, m.anzahl]), [['Adana', 2], ['Pommes', 1]]);
  assert.equal(mengen[1].artikel_name_tr, 'Patates');
});

test('Merkt sich je Artikel das älteste Kärtchen, unabhängig von der Reihenfolge', () => {
  const kaertchen = [
    karte('Adana', 'Adana', '2026-10-01T12:05:00'),
    karte('Adana', 'Adana', '2026-10-01T12:00:00'),
    karte('Adana', 'Adana', '2026-10-01T12:09:00'),
  ];
  assert.equal(offeneMengen(kaertchen)[0].aeltestes_seit, '2026-10-01T12:00:00');
});

test('Sortiert alphabetisch nach deutschem Artikelnamen, damit die Zeilen nicht springen', () => {
  const kaertchen = [karte('Pommes', 'Patates', 'x'), karte('Adana', 'Adana', 'x'), karte('Ayran', 'Ayran', 'x')];
  assert.deepEqual(offeneMengen(kaertchen).map((m) => m.artikel_name), ['Adana', 'Ayran', 'Pommes']);
});
