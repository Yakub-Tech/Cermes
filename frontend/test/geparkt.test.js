import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PARKPLAETZE, warenkorbParken, geparkteAusText, geparkteAlsText, eintragZurueckholen,
} from '../src/kasse/geparkt.js';

const ketchup = { id: 10, name: 'Ketchup', name_tr: 'Ketçap', aktiv: 1 };
const pommes = { id: 1, name: 'Pommes', name_tr: 'Patates', preis_cent: 300, ausverkauft: 0, beilagen: [ketchup] };
const wurst = { id: 2, name: 'Wurst', name_tr: 'Sosis', preis_cent: 250, ausverkauft: 0, beilagen: [] };

function position(artikel, beilagen, sonderwunsch, menge) {
  return { schluessel: 1, artikel, beilagen, sonderwunsch, menge };
}
let zaehler = 100;
const naechsterSchluessel = () => zaehler++;

test('Parken speichert nur Kennungen, Menge und Sonderwunsch, nicht das ganze Artikelobjekt', () => {
  const ergebnis = warenkorbParken([], [position(pommes, [ketchup], 'extra knusprig', 2)], 5000);
  assert.equal(ergebnis.fehler, null);
  assert.equal(ergebnis.geparkte.length, 1);
  const eintrag = ergebnis.geparkte[0];
  assert.deepEqual(eintrag.positionen, [{
    artikel_id: 1, artikel_name: 'Pommes', artikel_name_tr: 'Patates', preis_cent: 300,
    beilagen_ids: [10], sonderwunsch: 'extra knusprig', menge: 2,
  }]);
  assert.equal(eintrag.zeitpunkt, 5000);
});

test('Ein leerer Warenkorb lässt sich nicht parken', () => {
  const ergebnis = warenkorbParken([], [], 1);
  assert.equal(ergebnis.geparkte.length, 0);
});

test('Mehr als die erlaubten Parkplätze werden mit Laientext abgelehnt', () => {
  let geparkte = [];
  for (let i = 0; i < PARKPLAETZE; i += 1) {
    geparkte = warenkorbParken(geparkte, [position(wurst, [], '', 1)], i).geparkte;
  }
  assert.equal(geparkte.length, PARKPLAETZE);
  const ergebnis = warenkorbParken(geparkte, [position(wurst, [], '', 1)], 99);
  assert.equal(ergebnis.geparkte.length, PARKPLAETZE);
  assert.match(ergebnis.fehler.de, /Parkplätze/);
  assert.match(ergebnis.fehler.tr, /\S/);
});

test('Jeder geparkte Eintrag bekommt eine eigene Kennung', () => {
  let geparkte = warenkorbParken([], [position(wurst, [], '', 1)], 1).geparkte;
  geparkte = warenkorbParken(geparkte, [position(wurst, [], '', 1)], 1).geparkte;
  assert.notEqual(geparkte[0].id, geparkte[1].id);
});

test('Zurückholen nimmt Preis und Namen aus der aktuellen Artikelliste', () => {
  const eintrag = warenkorbParken([], [position(pommes, [ketchup], 'scharf', 2)], 1).geparkte[0];
  const teurer = { ...pommes, preis_cent: 350 };
  const ergebnis = eintragZurueckholen(eintrag, [teurer, wurst], naechsterSchluessel);
  assert.equal(ergebnis.positionen.length, 1);
  assert.equal(ergebnis.positionen[0].artikel, teurer);
  assert.equal(ergebnis.positionen[0].menge, 2);
  assert.equal(ergebnis.positionen[0].sonderwunsch, 'scharf');
  assert.deepEqual(ergebnis.positionen[0].beilagen, [ketchup]);
  assert.equal(ergebnis.preiseGeaendert, true);
  assert.deepEqual(ergebnis.entfernt, []);
});

test('Gleicher Preis meldet keine Preisänderung', () => {
  const eintrag = warenkorbParken([], [position(wurst, [], '', 1)], 1).geparkte[0];
  const ergebnis = eintragZurueckholen(eintrag, [wurst], naechsterSchluessel);
  assert.equal(ergebnis.preiseGeaendert, false);
});

test('Ausverkaufte oder verschwundene Artikel werden entfernt und benannt', () => {
  const eintrag = warenkorbParken([], [
    position(pommes, [], '', 1), position(wurst, [], '', 3),
  ], 1).geparkte[0];
  const ausverkauft = { ...pommes, ausverkauft: 1 };
  const ergebnis = eintragZurueckholen(eintrag, [ausverkauft], naechsterSchluessel);
  assert.equal(ergebnis.positionen.length, 0);
  assert.deepEqual(ergebnis.entfernt.map((e) => e.artikel_name), ['Pommes', 'Wurst']);
});

test('Eine Position mit inzwischen inaktiver oder fehlender Beilage wird entfernt', () => {
  const eintrag = warenkorbParken([], [position(pommes, [ketchup], '', 1)], 1).geparkte[0];
  const inaktiv = { ...pommes, beilagen: [{ ...ketchup, aktiv: 0 }] };
  assert.equal(eintragZurueckholen(eintrag, [inaktiv], naechsterSchluessel).entfernt.length, 1);
  const ohne = { ...pommes, beilagen: [] };
  assert.equal(eintragZurueckholen(eintrag, [ohne], naechsterSchluessel).entfernt.length, 1);
});

test('Gleiche Positionen nach dem Zurückholen bleiben getrennt, jede bekommt einen neuen Schlüssel', () => {
  const eintrag = warenkorbParken([], [
    position(wurst, [], '', 1), position(wurst, [], 'ohne Senf', 1),
  ], 1).geparkte[0];
  const ergebnis = eintragZurueckholen(eintrag, [wurst], naechsterSchluessel);
  assert.equal(ergebnis.positionen.length, 2);
  assert.notEqual(ergebnis.positionen[0].schluessel, ergebnis.positionen[1].schluessel);
});

test('Speichertext: kaputte oder fremde Inhalte ergeben eine leere Liste', () => {
  assert.deepEqual(geparkteAusText(null), []);
  assert.deepEqual(geparkteAusText('kein json'), []);
  assert.deepEqual(geparkteAusText('{"a":1}'), []);
  const eintrag = warenkorbParken([], [position(wurst, [], '', 1)], 1).geparkte;
  assert.deepEqual(geparkteAusText(geparkteAlsText(eintrag)), eintrag);
});

test('Speichertext: Einträge mit ungültigen Positionen werden ganz verworfen', () => {
  const gueltig = warenkorbParken([], [position(wurst, [], '', 1)], 1).geparkte[0];
  const mit = (aenderung) => ({ ...gueltig, positionen: [{ ...gueltig.positionen[0], ...aenderung }] });
  const ohneBeilagen = mit({});
  delete ohneBeilagen.positionen[0].beilagen_ids;
  const ohneId = { ...gueltig };
  delete ohneId.id;

  assert.deepEqual(geparkteAusText(JSON.stringify([{ positionen: [null] }])), []);
  assert.deepEqual(geparkteAusText(JSON.stringify([ohneBeilagen])), []);
  assert.deepEqual(geparkteAusText(JSON.stringify([mit({ menge: '2' })])), []);
  assert.deepEqual(geparkteAusText(JSON.stringify([mit({ menge: 0 })])), []);
  assert.deepEqual(geparkteAusText(JSON.stringify([mit({ sonderwunsch: { a: 1 } })])), []);
  assert.deepEqual(geparkteAusText(JSON.stringify([mit({ preis_cent: null })])), []);
  assert.deepEqual(geparkteAusText(JSON.stringify([ohneId])), []);
  assert.deepEqual(geparkteAusText(JSON.stringify([{ ...gueltig, positionen: [] }])), []);
  assert.deepEqual(geparkteAusText(JSON.stringify([gueltig])), [gueltig]);
});
