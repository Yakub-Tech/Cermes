import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detailZeilen } from '../src/admin/auditDetails.js';
import { de as auditDe } from '../src/sprache/audit.js';
import { de as gemeinsamDe } from '../src/sprache/gemeinsam.js';

const texte = { ...gemeinsamDe, ...auditDe };

test('einfache Werte werden mit übersetztem Feldnamen als Zeile ausgegeben', () => {
  const zeilen = detailZeilen({ werte: { artikel: 'Pommes', nummer: 1 } }, texte);
  assert.deepEqual(zeilen, ['Artikel: Pommes', 'Nummer: 1']);
});

test('Cent-Felder werden als Euro-Betrag formatiert', () => {
  const zeilen = detailZeilen({ werte: { preis_cent: 350 } }, texte);
  assert.deepEqual(zeilen, ['Preis: 3,50 €']);
});

test('leere und gefüllte Listen werden lesbar dargestellt', () => {
  assert.deepEqual(detailZeilen({ werte: { beilagen: [] } }, texte), ['Beilagen: keine']);
  assert.deepEqual(
    detailZeilen({ werte: { beilagen: ['Ketchup', 'Mayo'] } }, texte),
    ['Beilagen: Ketchup, Mayo']
  );
});

test('aktiv wird als Ja/Nein-Wort dargestellt, nicht als 0/1', () => {
  assert.deepEqual(detailZeilen({ werte: { aktiv: 1 } }, texte), ['Status: aktiv']);
  assert.deepEqual(detailZeilen({ werte: { aktiv: 0 } }, texte), ['Status: inaktiv']);
});

test('leerer Wert (null) wird als Platzhalter dargestellt', () => {
  assert.deepEqual(detailZeilen({ werte: { einkaufskosten_cent: null } }, texte), ['Einkaufskosten: –']);
});

test('Änderungen zeigen vorher und nachher mit Pfeil', () => {
  const zeilen = detailZeilen({
    aenderungen: {
      preis_cent: { vorher: 300, nachher: 350 },
      aktiv: { vorher: 1, nachher: 0 },
    },
  }, texte);
  assert.deepEqual(zeilen, ['Preis: 3,00 € → 3,50 €', 'Status: aktiv → inaktiv']);
});

test('Kärtchen-Status wird übersetzt statt als technischer Code angezeigt', () => {
  const zeilen = detailZeilen({
    werte: { nummer: 1, artikel: 'Pommes' },
    aenderungen: { status: { vorher: 'in_bearbeitung', nachher: 'abholbereit' } },
  }, texte);
  assert.deepEqual(zeilen, [
    'Nummer: 1', 'Artikel: Pommes', 'Status: in Bearbeitung → abholbereit',
  ]);
});

test('Kassier-Positionen werden je Zeile mit Nummer, Artikel, Beilagen und Preis dargestellt', () => {
  const zeilen = detailZeilen({
    werte: {
      kassiervorgang: 7, summe_cent: 850,
      positionen: [
        { nummer: 1, artikel_name: 'Pommes', beilagen: ['Ketchup'], preis_cent: 350 },
        { nummer: 1, artikel_name: 'Burger', beilagen: [], preis_cent: 500 },
      ],
    },
  }, texte);
  assert.deepEqual(zeilen, [
    'Kassiervorgang: 7',
    'Summe: 8,50 €',
    'Position: Nr. 1 Pommes (Ketchup), 3,50 €',
    'Position: Nr. 1 Burger, 5,00 €',
  ]);
});

test('unbekannte Felder fallen auf ihren Rohnamen zurück, ohne abzustürzen', () => {
  const zeilen = detailZeilen({ werte: { unbekanntesFeld: 'x' } }, texte);
  assert.deepEqual(zeilen, ['unbekanntesFeld: x']);
});

test('leere Details ergeben eine leere Zeilenliste', () => {
  assert.deepEqual(detailZeilen({}, texte), []);
  assert.deepEqual(detailZeilen({ werte: {}, aenderungen: {} }, texte), []);
});
