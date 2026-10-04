import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DESIGN_SCHLUESSEL, KUNDENDESIGN_SCHLUESSEL, STANDARD_DESIGN, gueltigesDesign, designLesen, designSpeichern,
} from '../src/design/designSpeicher.js';

function ersatzSpeicher(anfangswert) {
  const inhalt = {};
  if (anfangswert !== undefined) inhalt[DESIGN_SCHLUESSEL] = anfangswert;
  return {
    inhalt,
    getItem(schluessel) { return schluessel in inhalt ? inhalt[schluessel] : null; },
    setItem(schluessel, wert) { inhalt[schluessel] = String(wert); },
  };
}

test('der Standard ist dunkel', () => {
  assert.equal(STANDARD_DESIGN, 'dunkel');
});

test('gueltigesDesign lässt dunkel und hell durch, alles andere wird dunkel', () => {
  assert.equal(gueltigesDesign('dunkel'), 'dunkel');
  assert.equal(gueltigesDesign('hell'), 'hell');
  for (const wert of [null, undefined, '', 'Hell', 'blau', 42, {}]) {
    assert.equal(gueltigesDesign(wert), 'dunkel', `Wert ${String(wert)}`);
  }
});

test('designLesen liefert das gespeicherte Design', () => {
  assert.equal(designLesen(() => ersatzSpeicher('hell')), 'hell');
  assert.equal(designLesen(() => ersatzSpeicher('dunkel')), 'dunkel');
});

test('ohne Eintrag oder mit unbrauchbarem Inhalt ergibt designLesen dunkel', () => {
  assert.equal(designLesen(() => ersatzSpeicher()), 'dunkel');
  assert.equal(designLesen(() => ersatzSpeicher('grün')), 'dunkel');
});

test('wirft schon der Zugriff auf den Speicher, ergibt designLesen dunkel', () => {
  const gesperrt = () => { throw new Error('SecurityError'); };
  assert.equal(designLesen(gesperrt), 'dunkel');
});

test('designSpeichern schreibt hell und dunkel, ungültige Werte werden als dunkel gespeichert', () => {
  const speicher = ersatzSpeicher();
  designSpeichern(() => speicher, 'hell');
  assert.equal(speicher.inhalt[DESIGN_SCHLUESSEL], 'hell');
  designSpeichern(() => speicher, 'bunt');
  assert.equal(speicher.inhalt[DESIGN_SCHLUESSEL], 'dunkel');
});

test('designSpeichern wirft nicht, wenn der Speicher gesperrt oder voll ist', () => {
  const gesperrt = () => { throw new Error('SecurityError'); };
  assert.doesNotThrow(() => designSpeichern(gesperrt, 'hell'));
  const voll = ersatzSpeicher();
  voll.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.doesNotThrow(() => designSpeichern(() => voll, 'hell'));
});

test('ein anderer Schlüssel arbeitet unabhängig (Kundenanzeige der Kasse)', () => {
  const speicher = ersatzSpeicher('hell');
  designSpeichern(() => speicher, 'dunkel', 'cermes-kundendesign');
  assert.equal(speicher.inhalt['cermes-kundendesign'], 'dunkel');
  assert.equal(designLesen(() => speicher, 'cermes-kundendesign'), 'dunkel');
  assert.equal(designLesen(() => speicher), 'hell');
});

test('der Schlüssel der Kundenanzeige ist eigenständig und weicht vom Gerät ab', () => {
  assert.equal(KUNDENDESIGN_SCHLUESSEL, 'cermes-kundendesign');
  assert.notEqual(KUNDENDESIGN_SCHLUESSEL, DESIGN_SCHLUESSEL);
});

test('Gerät und Kundenanzeige speichern unabhängig voneinander', () => {
  const speicher = ersatzSpeicher();
  designSpeichern(() => speicher, 'hell', KUNDENDESIGN_SCHLUESSEL);
  assert.equal(designLesen(() => speicher, KUNDENDESIGN_SCHLUESSEL), 'hell');
  assert.equal(designLesen(() => speicher), 'dunkel');
  designSpeichern(() => speicher, 'hell');
  designSpeichern(() => speicher, 'dunkel', KUNDENDESIGN_SCHLUESSEL);
  assert.equal(designLesen(() => speicher), 'hell');
  assert.equal(designLesen(() => speicher, KUNDENDESIGN_SCHLUESSEL), 'dunkel');
});

test('ein gesperrter Speicher ergibt für die Kundenanzeige Dunkel', () => {
  const gesperrt = () => { throw new Error('SecurityError'); };
  assert.equal(designLesen(gesperrt, KUNDENDESIGN_SCHLUESSEL), 'dunkel');
  assert.doesNotThrow(() => designSpeichern(gesperrt, 'hell', KUNDENDESIGN_SCHLUESSEL));
});
