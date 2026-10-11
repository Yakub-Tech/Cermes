import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zeitpunktAnzeigen } from '../src/admin/datum.js';

test('ISO-Zeitstempel mit Versatz wird als deutsches Datum mit Uhrzeit angezeigt', () => {
  assert.equal(zeitpunktAnzeigen('2026-09-22T14:23:07+02:00'), '22.09.2026, 14:23');
});

test('Sekunden werden nicht mit angezeigt', () => {
  assert.equal(zeitpunktAnzeigen('2026-01-05T09:00:59+01:00'), '05.01.2026, 09:00');
});
