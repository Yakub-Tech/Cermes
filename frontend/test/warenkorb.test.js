import { test } from 'node:test';
import assert from 'node:assert/strict';
import { positionHinzufuegen, mengeAendern, positionenFuerApi } from '../src/kasse/warenkorb.js';

const pommes = { id: 1, name: 'Pommes', preis_cent: 300 };
const ketchup = { id: 10, name: 'Ketchup' };
const mayo = { id: 11, name: 'Mayo' };

test('neuer Artikel ohne Beilagen legt eine neue Position mit Menge 1 an', () => {
  const positionen = positionHinzufuegen([], pommes, [], () => 1);
  assert.equal(positionen.length, 1);
  assert.equal(positionen[0].menge, 1);
  assert.equal(positionen[0].artikel, pommes);
  assert.deepEqual(positionen[0].beilagen, []);
});

test('gleicher Artikel mit exakt gleichen Beilagen wird hochgezählt statt dupliziert', () => {
  let positionen = positionHinzufuegen([], pommes, [ketchup], () => 1);
  positionen = positionHinzufuegen(positionen, pommes, [ketchup], () => 2);
  assert.equal(positionen.length, 1);
  assert.equal(positionen[0].menge, 2);
});

test('Beilagen-Reihenfolge spielt beim Vergleich keine Rolle', () => {
  let positionen = positionHinzufuegen([], pommes, [ketchup, mayo], () => 1);
  positionen = positionHinzufuegen(positionen, pommes, [mayo, ketchup], () => 2);
  assert.equal(positionen.length, 1);
  assert.equal(positionen[0].menge, 2);
});

test('gleicher Artikel mit anderen Beilagen bekommt eine eigene Position', () => {
  let positionen = positionHinzufuegen([], pommes, [ketchup], () => 1);
  positionen = positionHinzufuegen(positionen, pommes, [mayo], () => 2);
  assert.equal(positionen.length, 2);
  assert.equal(positionen[0].menge, 1);
  assert.equal(positionen[1].menge, 1);
});

test('mengeAendern erhöht die Menge einer bestehenden Position', () => {
  let positionen = positionHinzufuegen([], pommes, [], () => 1);
  positionen = mengeAendern(positionen, 1, 1);
  assert.equal(positionen[0].menge, 2);
});

test('mengeAendern verringert die Menge, entfernt die Position aber nicht bei Menge 1', () => {
  let positionen = positionHinzufuegen([], pommes, [], () => 1);
  positionen = mengeAendern(positionen, 1, 1);
  positionen = mengeAendern(positionen, 1, -1);
  assert.equal(positionen.length, 1);
  assert.equal(positionen[0].menge, 1);
});

test('mengeAendern entfernt die Position, wenn die Menge auf 0 fallen würde', () => {
  let positionen = positionHinzufuegen([], pommes, [], () => 1);
  positionen = mengeAendern(positionen, 1, -1);
  assert.equal(positionen.length, 0);
});

test('positionenFuerApi entfaltet eine Position mit Menge 2 zu zwei einzelnen Einträgen', () => {
  const positionen = [
    { schluessel: 1, artikel: pommes, beilagen: [ketchup], menge: 2 },
  ];
  assert.deepEqual(positionenFuerApi(positionen), [
    { artikel_id: 1, beilagen_ids: [10] },
    { artikel_id: 1, beilagen_ids: [10] },
  ]);
});
