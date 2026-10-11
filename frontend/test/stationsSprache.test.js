import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spracheLesen, spracheSpeichern } from '../src/sprache/stationsSpracheSpeicher.js';

function ersatzSpeicher(wert) {
  const inhalt = wert === undefined ? {} : { sprache: wert };
  return {
    inhalt,
    getItem(schluessel) { return schluessel in inhalt ? inhalt[schluessel] : null; },
    setItem(schluessel, neu) { inhalt[schluessel] = String(neu); },
  };
}

test('gespeichertes Türkisch wird gelesen, alles andere ergibt Deutsch', () => {
  assert.equal(spracheLesen(() => ersatzSpeicher('tr')), 'tr');
  assert.equal(spracheLesen(() => ersatzSpeicher('de')), 'de');
  assert.equal(spracheLesen(() => ersatzSpeicher('xx')), 'de');
  assert.equal(spracheLesen(() => ersatzSpeicher()), 'de');
});

test('wirft schon der Zugriff auf den Speicher, gilt Deutsch und nichts stürzt ab', () => {
  const gesperrt = () => { throw new Error('SecurityError'); };
  assert.equal(spracheLesen(gesperrt), 'de');
  assert.doesNotThrow(() => spracheSpeichern(gesperrt, 'tr'));
});

test('die Sprache wird gespeichert', () => {
  const speicher = ersatzSpeicher();
  spracheSpeichern(() => speicher, 'tr');
  assert.equal(speicher.inhalt.sprache, 'tr');
});
