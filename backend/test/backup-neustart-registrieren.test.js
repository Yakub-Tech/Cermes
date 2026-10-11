import test from 'node:test';
import assert from 'node:assert/strict';
import { neustartRegistrieren, testNeustartFunktionSetzen } from '../src/routen/backup.js';

test('neustartRegistrieren: startet sofort neu, wenn die Antwort schon zerstört ist', () => {
  let aufrufe = 0;
  testNeustartFunktionSetzen(() => { aufrufe++; });
  try {
    const angehaengt = [];
    const antwort = { destroyed: true, on: (ereignis) => angehaengt.push(ereignis) };

    neustartRegistrieren(antwort);

    assert.equal(aufrufe, 1, 'der Neustart läuft sofort, ohne auf ein Ereignis zu warten');
    assert.deepEqual(angehaengt, [], 'es wird kein Listener mehr registriert, das Ereignis ist ja schon vorbei');
  } finally {
    testNeustartFunktionSetzen(() => {});
  }
});

test('neustartRegistrieren: wartet im Normalfall auf das Ende der Antwort', () => {
  let aufrufe = 0;
  testNeustartFunktionSetzen(() => { aufrufe++; });
  try {
    const handler = {};
    const antwort = { destroyed: false, on: (ereignis, funktion) => { handler[ereignis] = funktion; } };

    neustartRegistrieren(antwort);
    assert.equal(aufrufe, 0, 'vor dem Ende der Antwort darf noch kein Neustart laufen');

    handler.finish();
    assert.equal(aufrufe, 1, 'nach "finish" läuft der Neustart');
  } finally {
    testNeustartFunktionSetzen(() => {});
  }
});

test('neustartRegistrieren: löst bei "finish" gefolgt von "close" nur einmal aus', () => {
  let aufrufe = 0;
  testNeustartFunktionSetzen(() => { aufrufe++; });
  try {
    const handler = {};
    const antwort = { destroyed: false, on: (ereignis, funktion) => { handler[ereignis] = funktion; } };

    neustartRegistrieren(antwort);
    handler.finish();
    handler.close();

    assert.equal(aufrufe, 1, 'auch zwei aufeinanderfolgende Ereignisse lösen den Neustart nur einmal aus');
  } finally {
    testNeustartFunktionSetzen(() => {});
  }
});
