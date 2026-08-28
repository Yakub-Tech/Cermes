import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  berechnePendelPhase,
  PENDEL_GESCHWINDIGKEIT_PX_PRO_SEKUNDE,
  PENDEL_PAUSE_SEKUNDEN,
} from '../src/tv/pendelPhase.js';

test('bleibt oben stehen, wenn kein Überlauf vorliegt', () => {
  const ergebnis = berechnePendelPhase(0, 0);
  assert.equal(ergebnis.zielVersatzPx, 0);
  assert.equal(ergebnis.sekundenBisNaechsterWechsel, null);
});

test('steht zu Beginn oben und wartet dort die Pause-Zeit ab', () => {
  const ueberlaufPx = 400;
  const ergebnis = berechnePendelPhase(0, ueberlaufPx);
  assert.equal(ergebnis.zielVersatzPx, 0);
  assert.equal(ergebnis.sekundenBisNaechsterWechsel, PENDEL_PAUSE_SEKUNDEN);
});

test('fährt nach der Pause bis ganz nach unten', () => {
  const ueberlaufPx = 400;
  const fahrtSekunden = ueberlaufPx / PENDEL_GESCHWINDIGKEIT_PX_PRO_SEKUNDE;
  const mitteDerFahrt = PENDEL_PAUSE_SEKUNDEN + fahrtSekunden / 2;

  const ergebnis = berechnePendelPhase(mitteDerFahrt, ueberlaufPx);

  assert.equal(ergebnis.zielVersatzPx, ueberlaufPx);
});

test('wartet unten ebenfalls die Pause-Zeit ab, bevor der Zyklus von vorn beginnt', () => {
  const ueberlaufPx = 400;
  const fahrtSekunden = ueberlaufPx / PENDEL_GESCHWINDIGKEIT_PX_PRO_SEKUNDE;
  const zyklusSekunden = 2 * fahrtSekunden + 2 * PENDEL_PAUSE_SEKUNDEN;

  const kurzVorZyklusEnde = berechnePendelPhase(zyklusSekunden - 0.5, ueberlaufPx);
  assert.equal(kurzVorZyklusEnde.zielVersatzPx, 0);

  const zyklusSpaeter = berechnePendelPhase(zyklusSekunden, ueberlaufPx);
  assert.equal(zyklusSpaeter.zielVersatzPx, 0);
  assert.equal(zyklusSpaeter.sekundenBisNaechsterWechsel, PENDEL_PAUSE_SEKUNDEN);
});
