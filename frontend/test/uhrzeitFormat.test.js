import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatiereDatum, formatiereUhrzeit, berlinerJahr } from '../src/komponenten/uhrzeitFormat.js';

test('formatiert das Datum in Berlin-Zeit, unabhängig von der Zeitzone des Geräts', () => {
  const datum = new Date('2026-07-31T12:00:00Z');
  assert.equal(formatiereDatum(datum), '31.07.2026');
});

test('formatiert die Uhrzeit in Berlin-Zeit (Sommerzeit, +02:00)', () => {
  const datum = new Date('2026-07-31T12:23:07Z');
  assert.equal(formatiereUhrzeit(datum), '14:23:07');
});

test('formatiert die Uhrzeit in Berlin-Zeit (Normalzeit, +01:00) und über Mitternacht hinweg', () => {
  const datum = new Date('2026-01-05T23:30:00Z');
  assert.equal(formatiereDatum(datum), '06.01.2026');
  assert.equal(formatiereUhrzeit(datum), '00:30:00');
});

test('liefert das Jahr in Berlin-Zeit', () => {
  const datum = new Date('2026-01-05T23:30:00Z');
  assert.equal(berlinerJahr(datum), 2026);
});
