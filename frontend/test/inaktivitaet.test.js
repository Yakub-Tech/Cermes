import { test } from 'node:test';
import assert from 'node:assert/strict';
import { berechneVerbleibendeSekunden, formatiereCountdown } from '../src/anmeldung/inaktivitaet.js';

test('direkt nach einer Interaktion sind die vollen Sekunden übrig', () => {
  const zeitlimitMs = 30 * 60 * 1000;
  assert.equal(berechneVerbleibendeSekunden(1000, 1000, zeitlimitMs), 1800);
});

test('nach Ablauf des Zeitlimits ist der Wert 0', () => {
  const zeitlimitMs = 30 * 60 * 1000;
  assert.equal(berechneVerbleibendeSekunden(0, zeitlimitMs, zeitlimitMs), 0);
});

test('wird auch weit nach Ablauf nie negativ', () => {
  const zeitlimitMs = 30 * 60 * 1000;
  assert.equal(berechneVerbleibendeSekunden(0, zeitlimitMs * 5, zeitlimitMs), 0);
});

test('rundet auf ganze Sekunden', () => {
  const zeitlimitMs = 30 * 60 * 1000;
  assert.equal(berechneVerbleibendeSekunden(0, 600, zeitlimitMs), 1799);
});

test('formatiereCountdown zeigt Minuten:Sekunden, Sekunden zweistellig', () => {
  assert.equal(formatiereCountdown(1799), '29:59');
  assert.equal(formatiereCountdown(0), '0:00');
  assert.equal(formatiereCountdown(65), '1:05');
});
