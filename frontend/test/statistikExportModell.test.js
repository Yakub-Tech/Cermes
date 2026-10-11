import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportModellBauen, exportDateiname } from '../src/admin/statistikExportModell.js';

const artikel = [
  { artikel_name: 'Öl', stueck: 5, umsatz_cent: 500, gewinn_cent: 300, stueck_ohne_kosten: 0 },
  { artikel_name: 'Bratwurst', stueck: 20, umsatz_cent: 4000, gewinn_cent: 2500, stueck_ohne_kosten: 2 },
  { artikel_name: 'Zwiebeln', stueck: 10, umsatz_cent: 1000, gewinn_cent: 900, stueck_ohne_kosten: 0 },
];
const gesamt = { stueck: 35, umsatz_cent: 5500, gewinn_cent: 3700, stueck_ohne_kosten: 2 };

function eingabe(aenderung = {}) {
  return {
    ansicht: 'einzeltag', von: '2026-07-19', bis: '2026-07-19', sprache: 'de',
    gesamt, stosszeit: '14–15 Uhr', artikel, sortierung: 'alphabetisch',
    verlauf: [{ beschriftung: '14 Uhr', stueck: 30 }, { beschriftung: '15 Uhr', stueck: 5 }],
    verlaufArtikelName: '',
    stornos: [{ zeit: '14:05', nummer: 7, artikel_name: 'Öl', preis_cent: 100, storniert_von: 'kasse1' }],
    ...aenderung,
  };
}

function abschnitt(modell, id) {
  return modell.abschnitte.find((a) => a.id === id);
}

test('alphabetisch: alle drei Artikel-Abschnitte in deutscher Namensreihenfolge', () => {
  const modell = exportModellBauen(eingabe());
  for (const id of ['stueck', 'umsatz', 'gewinn']) {
    assert.deepEqual(abschnitt(modell, id).zeilen.map((z) => z[0]), ['Bratwurst', 'Öl', 'Zwiebeln']);
  }
});

test('absteigend: jeder Abschnitt nach seiner eigenen Kennzahl', () => {
  const modell = exportModellBauen(eingabe({ sortierung: 'absteigend' }));
  assert.deepEqual(abschnitt(modell, 'stueck').zeilen.map((z) => z[1]), [20, 10, 5]);
  assert.deepEqual(abschnitt(modell, 'gewinn').zeilen.map((z) => z[1]), [2500, 900, 300]);
});

test('Geldspalten haben Art euro und Rohwert in Cent, Summenzeile stimmt', () => {
  const umsatz = abschnitt(exportModellBauen(eingabe()), 'umsatz');
  assert.equal(umsatz.spalten[1].art, 'euro');
  assert.deepEqual(umsatz.summe, ['Summe', 5500]);
});

test('Gewinn-Abschnitt zeigt Stück ohne Kosten', () => {
  const gewinn = abschnitt(exportModellBauen(eingabe()), 'gewinn');
  assert.deepEqual(gewinn.zeilen[0], ['Bratwurst', 2500, 2]);
  assert.deepEqual(gewinn.summe, ['Summe', 3700, 2]);
});

test('ohne Geldfelder (Verwaltung) gibt es nur den Stück-Abschnitt', () => {
  const ohneGeld = artikel.map(({ artikel_name, stueck }) => ({ artikel_name, stueck }));
  const modell = exportModellBauen(eingabe({ artikel: ohneGeld, gesamt: { stueck: 35 } }));
  assert.equal(abschnitt(modell, 'umsatz'), undefined);
  assert.equal(abschnitt(modell, 'gewinn'), undefined);
  assert.ok(abschnitt(modell, 'stueck'));
  assert.deepEqual(modell.kennzahlen.map((k) => k.id), ['portionen', 'stosszeit']);
});

test('Verlauf behält die gelieferte Reihenfolge, Storno-Zeile mit Betrag in Cent', () => {
  const modell = exportModellBauen(eingabe());
  assert.deepEqual(abschnitt(modell, 'verlauf').zeilen, [['14 Uhr', 30], ['15 Uhr', 5]]);
  assert.deepEqual(abschnitt(modell, 'stornos').zeilen[0], ['14:05 Uhr', 7, 'Öl', 100, 'kasse1']);
});

test('Zeitraum-Ansicht: Storno mit Datumsspalte, Untertitel mit Zeitraum und Sortierung', () => {
  const modell = exportModellBauen(eingabe({
    ansicht: 'zeitraum', von: '2026-07-19', bis: '2026-07-21', sortierung: 'aufsteigend',
    stornos: [{ datum: '2026-07-20', zeit: '10:00', nummer: 3, artikel_name: 'Öl', preis_cent: 100, storniert_von: 'a' }],
  }));
  assert.equal(abschnitt(modell, 'stornos').zeilen[0][0], '20.07.2026');
  assert.ok(modell.untertitel.includes('19.07.2026 bis 21.07.2026'));
  assert.ok(modell.untertitel.includes('Sortierung: Aufsteigend'));
});

test('Türkisch: Titel, Spalten und Sortierung auf Türkisch', () => {
  const modell = exportModellBauen(eingabe({ sprache: 'tr', sortierung: 'absteigend' }));
  assert.equal(modell.titel, 'İstatistik');
  assert.ok(modell.untertitel.includes('Sıralama: Azalan'));
  assert.equal(abschnitt(modell, 'umsatz').titel, 'Ürüne göre ciro');
});

test('Artikelfilter des Verlaufs steht im Untertitel', () => {
  const modell = exportModellBauen(eingabe({ verlaufArtikelName: 'Bratwurst' }));
  assert.ok(modell.untertitel.includes('Verlauf nur für: Bratwurst'));
});

test('Dateiname mit Zeitraum', () => {
  assert.equal(exportDateiname(eingabe(), 'xlsx'), 'statistik_2026-07-19.xlsx');
  assert.equal(
    exportDateiname(eingabe({ ansicht: 'zeitraum', bis: '2026-07-21' }), 'pdf'),
    'statistik_2026-07-19_bis_2026-07-21.pdf',
  );
});

test('Verwaltung bekommt bei den Stornos keine Geldsumme, die Ansicht zeigt dort auch keine', () => {
  const ohneGeld = artikel.map(({ artikel_name, stueck }) => ({ artikel_name, stueck }));
  const verwaltung = exportModellBauen(eingabe({ artikel: ohneGeld, gesamt: { stueck: 35 } }));
  assert.equal(abschnitt(verwaltung, 'stornos').summe, null);
  assert.equal(abschnitt(verwaltung, 'stornos').zeilen.length, 1);

  const admin = exportModellBauen(eingabe());
  assert.deepEqual(abschnitt(admin, 'stornos').summe, ['Summe', '', '', 100, '']);
});
