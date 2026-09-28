import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buchungNachFehlerUnklar } from '../src/kasse/buchungUnklar.js';

function fehlerMitStatus(status) {
  const fehler = new Error('Fehler');
  fehler.status = status;
  return fehler;
}

test('ohne Serverantwort ist die Buchung unklar', () => {
  assert.equal(buchungNachFehlerUnklar(false, new Error('Server nicht erreichbar')), true);
  assert.equal(buchungNachFehlerUnklar(true, new Error('Server nicht erreichbar')), true);
});

test('eine Ablehnung ohne vorherige Unklarheit heißt: nicht gebucht', () => {
  assert.equal(buchungNachFehlerUnklar(false, fehlerMitStatus(409)), false);
  assert.equal(buchungNachFehlerUnklar(false, fehlerMitStatus(401)), false);
});

test('nach unklarer Buchung klären nur 400 und 409 den Vorgang, weil der Server dann die Kennung geprüft hat', () => {
  assert.equal(buchungNachFehlerUnklar(true, fehlerMitStatus(409)), false);
  assert.equal(buchungNachFehlerUnklar(true, fehlerMitStatus(400)), false);
});

test('nach unklarer Buchung bleibt sie bei Abmeldung, Rechteproblem oder Serverfehler unklar', () => {
  assert.equal(buchungNachFehlerUnklar(true, fehlerMitStatus(401)), true);
  assert.equal(buchungNachFehlerUnklar(true, fehlerMitStatus(403)), true);
  assert.equal(buchungNachFehlerUnklar(true, fehlerMitStatus(500)), true);
  assert.equal(buchungNachFehlerUnklar(true, fehlerMitStatus(502)), true);
});
