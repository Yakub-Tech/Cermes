import test from 'node:test';
import assert from 'node:assert/strict';
import { formatiereBerlinerZeit, heutigesDatum } from '../src/zeit.js';

test('formatiert einen Sommer-Zeitpunkt mit +02:00-Versatz (Sommerzeit)', () => {
  const datum = new Date('2026-07-31T12:00:00Z');
  assert.equal(formatiereBerlinerZeit(datum), '2026-07-31T14:00:00+02:00');
});

test('formatiert einen Winter-Zeitpunkt mit +01:00-Versatz (Normalzeit)', () => {
  const datum = new Date('2026-01-15T12:00:00Z');
  assert.equal(formatiereBerlinerZeit(datum), '2026-01-15T13:00:00+01:00');
});

test('new Date(...) auf dem Ergebnis ergibt exakt denselben Zeitpunkt zurück, unabhängig von der Zeitzone des lesenden Rechners', () => {
  const datum = new Date('2026-07-31T12:00:00Z');
  const zeichenkette = formatiereBerlinerZeit(datum);
  assert.equal(new Date(zeichenkette).getTime(), datum.getTime());
});

test('heutigesDatum liefert weiterhin nur den Datumsanteil (YYYY-MM-DD)', () => {
  assert.match(heutigesDatum(), /^\d{4}-\d{2}-\d{2}$/);
});
