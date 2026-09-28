import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erzeugeMeldungsFolge } from '../src/kasse/meldungsFolge.js';

function naechsterTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test('während eine Meldung läuft, wird nur der letzte Stand danach nachgesendet', async () => {
  const gesendet = [];
  const aufloesungen = [];
  const { melden } = erzeugeMeldungsFolge((stand) => {
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
  const { melden } = erzeugeMeldungsFolge((stand) => {
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
  const { melden } = erzeugeMeldungsFolge((stand) => {
    gesendet.push(stand);
    return Promise.resolve();
  });

  melden('A');
  assert.deepEqual(gesendet, ['A']);

  await naechsterTick();
  melden('B');
  assert.deepEqual(gesendet, ['A', 'B']);
});

test('erneutMelden schickt den letzten Stand noch einmal, auch nach einem Fehlschlag', async () => {
  const gesendet = [];
  let ersterVersuch = true;
  const { melden, erneutMelden } = erzeugeMeldungsFolge((stand) => {
    gesendet.push(stand);
    if (ersterVersuch) {
      ersterVersuch = false;
      return Promise.reject(new Error('Netzwerkfehler'));
    }
    return Promise.resolve();
  });

  melden('A');
  await naechsterTick();
  await naechsterTick();
  assert.deepEqual(gesendet, ['A']);

  erneutMelden();
  await naechsterTick();
  assert.deepEqual(gesendet, ['A', 'A']);
});

test('erneutMelden sendet den neuesten Stand und ohne bisherigen Stand nichts', async () => {
  const gesendet = [];
  const { melden, erneutMelden } = erzeugeMeldungsFolge((stand) => {
    gesendet.push(stand);
    return Promise.resolve();
  });

  erneutMelden();
  assert.deepEqual(gesendet, []);

  melden('A');
  await naechsterTick();
  melden('B');
  await naechsterTick();
  erneutMelden();
  assert.deepEqual(gesendet, ['A', 'B', 'B']);
});

test('ein leerer Stand wird ebenfalls erneut gemeldet', async () => {
  const gesendet = [];
  const { melden, erneutMelden } = erzeugeMeldungsFolge((stand) => {
    gesendet.push(stand);
    return Promise.resolve();
  });
  melden(null);
  await naechsterTick();
  erneutMelden();
  assert.deepEqual(gesendet, [null, null]);
});

function versprechenAbarbeiten() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('ein fehlgeschlagener Stand wird ohne weitere Bedienung nach kurzer Wartezeit erneut gesendet', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const gesendet = [];
  let fehlschlaege = 2;
  const { melden } = erzeugeMeldungsFolge((stand) => {
    gesendet.push(stand);
    if (fehlschlaege > 0) {
      fehlschlaege -= 1;
      return Promise.reject(new Error('Netzwerkfehler'));
    }
    return Promise.resolve();
  });

  melden('A');
  await versprechenAbarbeiten();
  assert.deepEqual(gesendet, ['A']);

  t.mock.timers.tick(3000);
  await versprechenAbarbeiten();
  assert.deepEqual(gesendet, ['A', 'A']);

  t.mock.timers.tick(10000);
  await versprechenAbarbeiten();
  assert.deepEqual(gesendet, ['A', 'A', 'A']);

  t.mock.timers.tick(60000);
  await versprechenAbarbeiten();
  assert.deepEqual(gesendet, ['A', 'A', 'A']);
});

test('die automatische Wiederholung ist begrenzt', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const gesendet = [];
  const { melden } = erzeugeMeldungsFolge((stand) => {
    gesendet.push(stand);
    return Promise.reject(new Error('Netzwerkfehler'));
  });

  melden('A');
  for (let i = 0; i < 10; i++) {
    await versprechenAbarbeiten();
    t.mock.timers.tick(60000);
  }
  await versprechenAbarbeiten();
  assert.deepEqual(gesendet, ['A', 'A', 'A', 'A']);
});

test('ein neuerer Stand während der Wartezeit ersetzt die Wiederholung des alten', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const gesendet = [];
  const { melden } = erzeugeMeldungsFolge((stand) => {
    gesendet.push(stand);
    if (stand === 'A') return Promise.reject(new Error('Netzwerkfehler'));
    return Promise.resolve();
  });

  melden('A');
  await versprechenAbarbeiten();
  melden('B');
  await versprechenAbarbeiten();
  assert.deepEqual(gesendet, ['A', 'B']);

  t.mock.timers.tick(60000);
  await versprechenAbarbeiten();
  assert.deepEqual(gesendet, ['A', 'B']);
});
