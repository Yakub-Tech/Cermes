import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inaktivHinweisMerken, inaktivHinweisAbholen } from '../src/anmeldung/inaktivHinweisSpeicher.js';

const SCHLUESSEL = 'cermes-inaktiv-abgemeldet';

function ersatzSpeicher(anfangswert) {
  const inhalt = {};
  if (anfangswert !== undefined) inhalt[SCHLUESSEL] = anfangswert;
  return {
    inhalt,
    getItem(schluessel) { return schluessel in inhalt ? inhalt[schluessel] : null; },
    setItem(schluessel, wert) { inhalt[schluessel] = String(wert); },
    removeItem(schluessel) { delete inhalt[schluessel]; },
  };
}

test('der Hinweis wird gemerkt, einmal abgeholt und dabei entfernt', () => {
  const speicher = ersatzSpeicher();
  inaktivHinweisMerken(() => speicher, 30);
  assert.equal(speicher.inhalt[SCHLUESSEL], '{"minuten":30}');
  assert.equal(inaktivHinweisAbholen(() => speicher), 30);
  assert.equal(SCHLUESSEL in speicher.inhalt, false);
  assert.equal(inaktivHinweisAbholen(() => speicher), null);
});

test('ohne gemerkten Hinweis ergibt das Abholen null', () => {
  assert.equal(inaktivHinweisAbholen(() => ersatzSpeicher()), null);
});

test('unlesbarer oder unbrauchbarer Inhalt ergibt null und wird trotzdem entfernt', () => {
  for (const inhalt of ['{kaputt', 'null', '{}', '{"minuten":"viel"}', '42']) {
    const speicher = ersatzSpeicher(inhalt);
    assert.equal(inaktivHinweisAbholen(() => speicher), null, `Inhalt ${inhalt}`);
    assert.equal(SCHLUESSEL in speicher.inhalt, false, `Inhalt ${inhalt}`);
  }
});

test('wirft schon der Zugriff auf den Speicher, gibt es keinen Hinweis und nichts stürzt ab', () => {
  const gesperrt = () => { throw new Error('SecurityError'); };
  assert.equal(inaktivHinweisAbholen(gesperrt), null);
  assert.doesNotThrow(() => inaktivHinweisMerken(gesperrt, 30));
});

test('ist der Speicher voll, wirft das Merken nicht', () => {
  const speicher = ersatzSpeicher();
  speicher.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.doesNotThrow(() => inaktivHinweisMerken(() => speicher, 30));
});

test('scheitert das Lesen oder Entfernen, wirft das Abholen nicht', () => {
  const lesenScheitert = ersatzSpeicher('{"minuten":30}');
  lesenScheitert.getItem = () => { throw new Error('SecurityError'); };
  assert.equal(inaktivHinweisAbholen(() => lesenScheitert), null);

  const entfernenScheitert = ersatzSpeicher('{"minuten":30}');
  entfernenScheitert.removeItem = () => { throw new Error('SecurityError'); };
  assert.equal(inaktivHinweisAbholen(() => entfernenScheitert), null);
});
