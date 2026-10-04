import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const QUELLORDNER = new URL('../src/', import.meta.url);

const DATEIEN = readdirSync(QUELLORDNER, { recursive: true })
  .filter((pfad) => /\.jsx?$/.test(pfad))
  .sort();

const FESTE_FARBEN_ERLAUBT = {
  'admin/artikelStandardFarbe.js': 'Artikelfarbe ist ein Datenwert und unabhängig vom Theme',
  'admin/statistikFarben.js': 'PDF und Excel sind Papier und bleiben immer hell',
  'admin/statistikDiagramm.js': 'Diagrammbild für das PDF, immer hell',
  'admin/statistikPdf.js': 'PDF ist Papier, immer hell',
  'komponenten/Flagge.jsx': 'Flaggen haben feste Landesfarben',
  'komponenten/farbe.js': 'rechnet mit Artikelfarben und nennt Schwarz oder Weiß als Schrift',
};

const ALTE_FARBNAMEN = /-(blau|navy|weinrot|gruen|akzent)(-hell|-blass|-text)?(\/\d+)?(?![\w-])|akzentrand/;
const SCHRIFT_FLAECHE = /text-flaeche(?![\w-])/;
const FESTE_FARBE = /rgba?\(|#[0-9a-fA-F]{3,8}\b/;

test('die Ausnahmeliste nennt nur Dateien, die es gibt', () => {
  for (const datei of Object.keys(FESTE_FARBEN_ERLAUBT)) {
    assert.ok(existsSync(new URL(datei, QUELLORDNER)), `${datei} fehlt`);
  }
});

for (const datei of DATEIEN) {
  test(`${datei} nutzt nur die neuen Tokens`, () => {
    const text = readFileSync(new URL(datei, QUELLORDNER), 'utf8');
    assert.doesNotMatch(text, ALTE_FARBNAMEN, 'alter Farbname');
    assert.doesNotMatch(text, SCHRIFT_FLAECHE, 'text-flaeche auf gefüllter Fläche');
    if (!(datei in FESTE_FARBEN_ERLAUBT)) {
      assert.doesNotMatch(text, FESTE_FARBE, 'fester Farbwert statt Token');
    }
  });
}

const WEISS_AUF_GEFUELLT = /bg-(erfolg|gefahr)(?![\w/-])[^"'`]*text-white|text-white[^"'`]*bg-(erfolg|gefahr)(?![\w/-])/;

for (const datei of DATEIEN) {
  test(`${datei} setzt weiße Schrift nur auf die Füllungs-Tokens`, () => {
    const text = readFileSync(new URL(datei, QUELLORDNER), 'utf8');
    assert.doesNotMatch(text, WEISS_AUF_GEFUELLT);
  });
}

test('der Urheberrechtshinweis wird nicht zusätzlich abgedunkelt', () => {
  const text = readFileSync(new URL('komponenten/Urheberrechtshinweis.jsx', QUELLORDNER), 'utf8');
  assert.doesNotMatch(text, /opacity-/);
});

const FELDER = [
  'komponenten/ui/input.jsx',
  'komponenten/Zahlenfeld.jsx',
  'komponenten/Auswahlmenue.jsx',
  'komponenten/Kontrollkaestchen.jsx',
  'admin/ExportAuswahlDialog.jsx',
  'admin/ArtikelFormular.jsx',
  'kasse/BeilagenDialog.jsx',
];

for (const datei of FELDER) {
  test(`${datei} zeichnet den Rand mit dem Token feldrahmen`, () => {
    const text = readFileSync(new URL(datei, QUELLORDNER), 'utf8');
    assert.match(text, /border-feldrahmen/);
    assert.doesNotMatch(text, /border-schrift-gedimmt\/(35|60)/);
  });
}

test('Kontrollkästchen sind eckig und keine Kreise', () => {
  const text = readFileSync(new URL('komponenten/Kontrollkaestchen.jsx', QUELLORDNER), 'utf8');
  assert.match(text, /rounded-\[3px\]/);
  assert.doesNotMatch(text, /rounded-md/);
});
