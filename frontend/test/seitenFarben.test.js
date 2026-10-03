import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const DATEIEN = [
  'komponenten/Dialog.jsx',
  'komponenten/SprachSchalter.jsx',
  'komponenten/Zahlenfeld.jsx',
  'komponenten/Auswahlmenue.jsx',
  'komponenten/Kontrollkaestchen.jsx',
  'komponenten/DateiAuswahl.jsx',
  'komponenten/LadefehlerHinweis.jsx',
  'komponenten/Hinweiskasten.jsx',
  'komponenten/ui/input.jsx',
  'komponenten/ui/label.jsx',
  'start/ZielKaertchen.jsx',
  'start/StartSeite.jsx',
  'start/NetzwerkAdresse.jsx',
  'start/NetzwerkHilfeDialog.jsx',
  'komponenten/Kopfzeile.jsx',
  'anmeldung/LoginSeite.jsx',
  'anmeldung/PasswortAendernFormular.jsx',
  'anmeldung/Ersteinrichtung.jsx',
  'komponenten/Pillenschalter.jsx',
  'komponenten/Reiterleiste.jsx',
  'komponenten/ui/table.jsx',
  'komponenten/Urheberrechtshinweis.jsx',
  'admin/eingabeKlasse.js',
  'admin/AdminLayout.jsx',
  'komponenten/Fusszeile.jsx',
  'komponenten/NichtGefundenInhalt.jsx',
  'admin/ArtikelSeite.jsx',
  'admin/StartnummerDialog.jsx',
  'admin/ArtikelFormular.jsx',
];

const ALTE_FARBNAMEN = /-(blau|navy|weinrot|gruen|akzent)(-hell|-blass|-text)?(\/\d+)?(?![\w-])/;
const SCHRIFT_FLAECHE = /text-flaeche(?![\w-])/;
const FESTE_FARBE = /rgba?\(|#[0-9a-fA-F]{3,8}\b/;

for (const datei of DATEIEN) {
  test(`${datei} nutzt nur die neuen Tokens`, () => {
    const text = readFileSync(new URL(`../src/${datei}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, ALTE_FARBNAMEN, 'alter Farbname (Alias-Brücke)');
    assert.doesNotMatch(text, SCHRIFT_FLAECHE, 'text-flaeche auf gefüllter Fläche');
    assert.doesNotMatch(text, FESTE_FARBE, 'fester Farbwert statt Token');
  });
}
