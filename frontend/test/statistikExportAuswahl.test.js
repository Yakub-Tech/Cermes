import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportModellBauen, modellAuswaehlen, alleAuswahlIds } from '../src/admin/statistikExportModell.js';
import { textUmbrechen, skalaBauen, inTeileZerlegen } from '../src/admin/statistikDiagrammMasse.js';

const artikel = [
  { artikel_name: 'Öl', stueck: 5, umsatz_cent: 500, gewinn_cent: 300, stueck_ohne_kosten: 0 },
  { artikel_name: 'Bratwurst', stueck: 20, umsatz_cent: 4000, gewinn_cent: 2500, stueck_ohne_kosten: 2 },
  { artikel_name: 'Zwiebeln', stueck: 10, umsatz_cent: 1000, gewinn_cent: 900, stueck_ohne_kosten: 0 },
];
const gesamt = { stueck: 35, umsatz_cent: 5500, gewinn_cent: 3700, stueck_ohne_kosten: 2 };

function eingabe(aenderung = {}) {
  return {
    ansicht: 'einzeltag', von: '2026-07-19', bis: '2026-07-19', sprache: 'de',
    gesamt, stosszeit: '14–15 Uhr', artikel, sortierung: 'absteigend',
    verlauf: [{ beschriftung: '14 Uhr', stueck: 30 }, { beschriftung: '15 Uhr', stueck: 5 }],
    verlaufArtikelName: '',
    stornos: [{ zeit: '14:05', nummer: 7, artikel_name: 'Öl', preis_cent: 100, storniert_von: 'kasse1' }],
    ...aenderung,
  };
}

function grafik(modell, id) {
  return modell.bloecke.map((b) => b.grafik).find((g) => g && g.id === id);
}

test('Grafiken haben dieselben Daten in derselben Sortierung wie die Tabellen', () => {
  const modell = exportModellBauen(eingabe());
  assert.deepEqual(grafik(modell, 'grafikStueck').daten.map((d) => [d.beschriftung, d.wert]),
    [['Bratwurst', 20], ['Zwiebeln', 10], ['Öl', 5]]);
  assert.deepEqual(grafik(modell, 'grafikUmsatz').daten.map((d) => d.wert), [4000, 1000, 500]);
  assert.equal(grafik(modell, 'grafikUmsatz').format, 'euro');
  assert.deepEqual(grafik(modell, 'grafikVerlauf').daten.map((d) => d.beschriftung), ['14 Uhr', '15 Uhr']);
});

test('Gewinn-Grafik färbt Artikel ohne Kosten grau und hat eine Legende', () => {
  const gewinn = grafik(exportModellBauen(eingabe()), 'grafikGewinn');
  const bratwurst = gewinn.daten.find((d) => d.beschriftung === 'Bratwurst');
  const oel = gewinn.daten.find((d) => d.beschriftung === 'Öl');
  assert.notEqual(bratwurst.farbe, oel.farbe);
  assert.equal(gewinn.legende.length, 2);
});

test('Verwaltung (ohne Geldfelder) bekommt keine Umsatz- und Gewinn-Grafik', () => {
  const ohneGeld = artikel.map(({ artikel_name, stueck }) => ({ artikel_name, stueck }));
  const modell = exportModellBauen(eingabe({ artikel: ohneGeld, gesamt: { stueck: 35 } }));
  assert.deepEqual(alleAuswahlIds(modell), ['uebersicht', 'stueck', 'grafikStueck', 'verlauf', 'grafikVerlauf', 'stornos']);
});

test('Ohne Daten gibt es keine Grafik, die Tabelle bleibt', () => {
  const modell = exportModellBauen(eingabe({ artikel: [], verlauf: [], gesamt: { ...gesamt, stueck: 0 } }));
  assert.equal(grafik(modell, 'grafikStueck'), undefined);
  assert.ok(alleAuswahlIds(modell).includes('stueck'));
  assert.ok(!alleAuswahlIds(modell).includes('grafikStueck'));
});

test('Auswahlgruppen: Übersicht zuerst, Tabelle und Grafik gehören zusammen', () => {
  const gruppen = exportModellBauen(eingabe()).auswahlGruppen;
  assert.deepEqual(gruppen[0].eintraege.map((e) => e.id), ['uebersicht']);
  assert.deepEqual(gruppen[1].eintraege.map((e) => [e.id, e.art]), [['stueck', 'tabelle'], ['grafikStueck', 'grafik']]);
  assert.deepEqual(gruppen[gruppen.length - 1].eintraege.map((e) => e.id), ['stornos']);
});

test('alles gewählt ändert das Modell nicht', () => {
  const modell = exportModellBauen(eingabe());
  const gewaehlt = modellAuswaehlen(modell, alleAuswahlIds(modell));
  assert.deepEqual(gewaehlt.bloecke.map((b) => b.id), modell.bloecke.map((b) => b.id));
  assert.equal(gewaehlt.kennzahlen.length, modell.kennzahlen.length);
});

test('abgewählte Tabelle: Grafik bleibt allein im Block', () => {
  const modell = exportModellBauen(eingabe());
  const ids = alleAuswahlIds(modell).filter((id) => id !== 'stueck');
  const block = modellAuswaehlen(modell, ids).bloecke.find((b) => b.id === 'stueck');
  assert.equal(block.abschnitt, null);
  assert.equal(block.grafik.id, 'grafikStueck');
});

test('Tabelle und Grafik abgewählt: der Block fehlt komplett', () => {
  const modell = exportModellBauen(eingabe());
  const ids = alleAuswahlIds(modell).filter((id) => id !== 'stueck' && id !== 'grafikStueck');
  const gewaehlt = modellAuswaehlen(modell, ids);
  assert.equal(gewaehlt.bloecke.find((b) => b.id === 'stueck'), undefined);
});

test('Übersicht abgewählt: keine Kennzahlen und kein Hinweis', () => {
  const modell = exportModellBauen(eingabe());
  const ids = alleAuswahlIds(modell).filter((id) => id !== 'uebersicht');
  const gewaehlt = modellAuswaehlen(modell, ids);
  assert.deepEqual(gewaehlt.kennzahlen, []);
  assert.equal(gewaehlt.hinweisOhneKosten, false);
});

test('textUmbrechen: kurzer Text bleibt, langer bricht um und endet mit Auslassung', () => {
  const messen = (t) => t.length * 10;
  assert.deepEqual(textUmbrechen('Pommes', 100, messen, 2), ['Pommes']);
  assert.deepEqual(textUmbrechen('Gemischter Salat mit Joghurt', 150, messen, 2), ['Gemischter', 'Salat mit…']);
  assert.deepEqual(textUmbrechen('Gemischter Salat', 150, messen, 2), ['Gemischter', 'Salat']);
});

test('textUmbrechen: ein Wort ohne Leerzeichen wird hart gekürzt', () => {
  const messen = (t) => t.length * 10;
  const zeilen = textUmbrechen('Donnerstagsschnitzelbrötchenmitallem', 100, messen, 2);
  assert.equal(zeilen.length, 2);
  assert.ok(zeilen.every((z) => messen(z) <= 100));
  assert.ok(zeilen[1].endsWith('…'));
});

test('skalaBauen: runde Obergrenze und gleichmäßige Schritte', () => {
  assert.deepEqual(skalaBauen(0, 37), { min: 0, max: 40, schritte: [0, 10, 20, 30, 40] });
  assert.deepEqual(skalaBauen(0, 0), { min: 0, max: 1, schritte: [0, 1] });
  assert.deepEqual(skalaBauen(0, 4200), { min: 0, max: 5000, schritte: [0, 1000, 2000, 3000, 4000, 5000] });
});

test('skalaBauen: negative Werte erweitern die Skala nach unten', () => {
  const skala = skalaBauen(-130, 400);
  assert.ok(skala.min <= -130 && skala.max >= 400);
  assert.ok(skala.schritte.includes(0));
});

test('inTeileZerlegen teilt in gleich große Stücke ohne Rest zu verlieren', () => {
  const teile = inTeileZerlegen([1, 2, 3, 4, 5], 2);
  assert.deepEqual(teile, [[1, 2], [3, 4], [5]]);
  assert.deepEqual(inTeileZerlegen([1, 2, 3, 4, 5, 6, 7], 4).map((t) => t.length), [4, 3]);
  assert.deepEqual(inTeileZerlegen([], 2), []);
  assert.deepEqual(inTeileZerlegen([1, 2, 3], Infinity), [[1, 2, 3]]);
});

test('inTeileZerlegen teilt gleichmäßig, es bleiben keine Waisen übrig', () => {
  const vierunddreissig = Array.from({ length: 34 }, (_, i) => i);
  assert.deepEqual(inTeileZerlegen(vierunddreissig, 12).map((t) => t.length), [12, 11, 11]);
  assert.deepEqual(inTeileZerlegen(vierunddreissig, 29).map((t) => t.length), [17, 17]);
  assert.deepEqual(inTeileZerlegen(vierunddreissig, 40).map((t) => t.length), [34]);
  assert.deepEqual(inTeileZerlegen(vierunddreissig, 12).flat(), vierunddreissig);
});
