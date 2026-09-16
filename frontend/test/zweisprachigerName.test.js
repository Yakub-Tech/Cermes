import test from 'node:test';
import assert from 'node:assert/strict';
import { zweisprachigerName, beideSprachenName } from '../src/sprache/zweisprachigerName.js';

test('zweisprachigerName: Türkisch nur bei aktivem Schalter und vorhandenem Wert', () => {
  assert.equal(zweisprachigerName('Pommes', 'Patates', 'tr'), 'Patates');
  assert.equal(zweisprachigerName('Pommes', 'Patates', 'de'), 'Pommes');
  assert.equal(zweisprachigerName('Adana', null, 'tr'), 'Adana');
  assert.equal(zweisprachigerName('Adana', '', 'tr'), 'Adana');
  assert.equal(zweisprachigerName('Adana', undefined, 'tr'), 'Adana');
});

test('beideSprachenName: beide Sprachen mit Trenner, nur Deutsch ohne Trenner', () => {
  assert.equal(beideSprachenName('Pommes', 'Patates'), 'Pommes / Patates');
  assert.equal(beideSprachenName('Adana', null), 'Adana');
  assert.equal(beideSprachenName('Adana', ''), 'Adana');
});
