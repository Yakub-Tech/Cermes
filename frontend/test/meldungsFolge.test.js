import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erzeugeMeldungsFolge } from '../src/kasse/meldungsFolge.js';

function naechsterTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test('während eine Meldung läuft, wird nur der letzte Stand danach nachgesendet', async () => {
  const gesendet = [];
  const aufloesungen = [];
  const melden = erzeugeMeldungsFolge((stand) => {
    gesendet.push(stand);
    return new Promise((resolve) => aufloesungen.push(resolve));
  });

  melden('A');
  melden('B');
  melden('C');

  assert.deepEqual(gesendet, ['A']);

  aufloesungen[0]();
  await naechsterTick();
  assert.deepEqual(gesendet, ['A', 'C']);

  aufloesungen[1]();
  await naechsterTick();
  assert.deepEqual(gesendet, ['A', 'C']);
});

test('ein Fehlschlag blockiert die Folge nicht', async () => {
  const gesendet = [];
  let fehlschlagen;
  const melden = erzeugeMeldungsFolge((stand) => {
    gesendet.push(stand);
    if (stand === 'A') {
      return new Promise((_resolve, reject) => { fehlschlagen = reject; });
    }
    return Promise.resolve();
  });

  melden('A');
  melden('B');
  fehlschlagen(new Error('Netzwerkfehler'));

  await naechsterTick();
  await naechsterTick();

  assert.deepEqual(gesendet, ['A', 'B']);
});

test('ohne laufende Meldung wird sofort gesendet', async () => {
  const gesendet = [];
  const melden = erzeugeMeldungsFolge((stand) => {
    gesendet.push(stand);
    return Promise.resolve();
  });

  melden('A');
  assert.deepEqual(gesendet, ['A']);

  await naechsterTick();
  melden('B');
  assert.deepEqual(gesendet, ['A', 'B']);
});
