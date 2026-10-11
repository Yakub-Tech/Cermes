import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sollEnterAbsenden } from '../src/anmeldung/enterAbsenden.js';

test('Enter ohne laufende Anmeldung löst ein Absenden aus', () => {
  assert.equal(sollEnterAbsenden({ taste: 'Enter', wiederholt: false, laeuft: false }), true);
});

test('andere Tasten lösen kein Absenden aus', () => {
  assert.equal(sollEnterAbsenden({ taste: 'Tab', wiederholt: false, laeuft: false }), false);
});

test('gehaltene Enter-Taste (Auto-Repeat) löst kein erneutes Absenden aus', () => {
  assert.equal(sollEnterAbsenden({ taste: 'Enter', wiederholt: true, laeuft: false }), false);
});

test('während eine Anmeldung läuft, löst Enter kein weiteres Absenden aus', () => {
  assert.equal(sollEnterAbsenden({ taste: 'Enter', wiederholt: false, laeuft: true }), false);
});
