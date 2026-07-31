import { test } from 'node:test';
import assert from 'node:assert/strict';
import { staerkstesElement } from '../src/admin/staerkstesElement.js';

test('gibt das Element mit dem höchsten Wert zurück', () => {
  const zeilen = [
    { stunde: 12, stueck: 5 },
    { stunde: 18, stueck: 42 },
    { stunde: 20, stueck: 10 },
  ];
  assert.deepEqual(staerkstesElement(zeilen, 'stueck'), { stunde: 18, stueck: 42 });
});

test('gibt bei leerer Liste null zurück', () => {
  assert.equal(staerkstesElement([], 'stueck'), null);
});

test('nimmt bei Gleichstand das erste vorkommende Element', () => {
  const zeilen = [
    { tag: '2026-07-10', stueck: 30 },
    { tag: '2026-07-12', stueck: 30 },
  ];
  assert.deepEqual(staerkstesElement(zeilen, 'stueck'), { tag: '2026-07-10', stueck: 30 });
});
