import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kaertchenSchluessel, findeNeueSchluessel } from '../src/tv/neueKaertchen.js';

const adana12 = { nummer: 12, artikel_name: 'Adana' };
const pommes13 = { nummer: 13, artikel_name: 'Pommes' };
const adana14 = { nummer: 14, artikel_name: 'Adana' };

test('der erste Stand (keine alte Liste) hat nichts Neues', () => {
  assert.deepEqual(findeNeueSchluessel(null, [adana12, pommes13]), []);
});

test('findet nur Kärtchen, die in der alten Liste fehlten', () => {
  const neu = findeNeueSchluessel([adana12], [adana12, pommes13]);
  assert.deepEqual(neu, [kaertchenSchluessel(pommes13)]);
});

test('mehrere neue Kärtchen werden alle gefunden', () => {
  const neu = findeNeueSchluessel([adana12], [adana12, pommes13, adana14]);
  assert.deepEqual(neu, [kaertchenSchluessel(pommes13), kaertchenSchluessel(adana14)]);
});

test('entfernte oder unveränderte Kärtchen sind nicht neu', () => {
  assert.deepEqual(findeNeueSchluessel([adana12, pommes13], [adana12]), []);
  assert.deepEqual(findeNeueSchluessel([adana12], [adana12]), []);
});

test('eine leere alte Liste ist ein echter Stand: alles Neue zählt', () => {
  assert.deepEqual(findeNeueSchluessel([], [adana12]), [kaertchenSchluessel(adana12)]);
});
