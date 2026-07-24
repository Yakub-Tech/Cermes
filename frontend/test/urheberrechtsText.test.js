import { test } from 'node:test';
import assert from 'node:assert/strict';
import { berechneUrheberrechtsText } from '../src/komponenten/urheberrechtsText.js';

test('zeigt nur das Startjahr, wenn das aktuelle Jahr gleich dem Startjahr ist', () => {
  assert.equal(berechneUrheberrechtsText(2026, 2026), '© 2026 YU');
});

test('zeigt einen Zeitraum, sobald ein späteres Jahr erreicht ist', () => {
  assert.equal(berechneUrheberrechtsText(2026, 2027), '© 2026–2027 YU');
  assert.equal(berechneUrheberrechtsText(2026, 2030), '© 2026–2030 YU');
});
