import { test } from 'node:test';
import assert from 'node:assert/strict';
import { externeAdressenFinden } from '../scripts/externeAdressen.js';

test('Namensräume und lokale Adressen sind erlaubt', () => {
  const text = `<svg xmlns='http://www.w3.org/2000/svg'></svg> url(http://localhost:8080/x) http://127.0.0.1/y`;
  assert.deepEqual(externeAdressenFinden(text), []);
});

test('Online-Schriften und CDNs werden gefunden, jede Adresse nur einmal', () => {
  const text = `@import url("https://fonts.googleapis.com/css2?family=Geist");
    <script src="https://cdn.jsdelivr.net/npm/x.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Geist">`;
  assert.deepEqual(externeAdressenFinden(text), [
    'https://cdn.jsdelivr.net/npm/x.js',
    'https://fonts.googleapis.com/css2?family=Geist',
  ]);
});

test('Text ohne Adressen ergibt eine leere Liste', () => {
  assert.deepEqual(externeAdressenFinden('body { color: red; }'), []);
});

test('Base64-Daten mit Schrägstrichen werden nicht als Adresse gedeutet', () => {
  assert.deepEqual(externeAdressenFinden('url(data:font/woff2;base64,AAAA//8A//BB==)'), []);
});

test('Adressen in Kommentaren zählen nicht (Tailwind schreibt eine Lizenzzeile ins CSS)', () => {
  const css = '/*! tailwindcss v4.1.0 | MIT License | https://tailwindcss.com */ body { color: red; }';
  assert.deepEqual(externeAdressenFinden(css), []);
  assert.deepEqual(externeAdressenFinden('<!-- https://beispiel.de --><p>Text</p>'), []);
});

test('eine Adresse neben einem Kommentar wird weiter gefunden', () => {
  const css = '/* Lizenz https://tailwindcss.com */ @import url("https://fonts.googleapis.com/css2");';
  assert.deepEqual(externeAdressenFinden(css), ['https://fonts.googleapis.com/css2']);
});

test('Adressen ohne Protokoll werden gefunden', () => {
  const text = `@import url(//fonts.googleapis.com/css2?family=Geist);
    <script src="//cdn.jsdelivr.net/npm/x.js"></script>
    <link href='//cdn.example.com/a.css'> <img src=//bilder.example.com/b.png>`;
  assert.deepEqual(externeAdressenFinden(text), [
    '//bilder.example.com/b.png',
    '//cdn.example.com/a.css',
    '//cdn.jsdelivr.net/npm/x.js',
    '//fonts.googleapis.com/css2?family=Geist',
  ]);
});

test('doppelte Schrägstriche in Base64, Pfaden und Skript-Kommentaren sind keine Adresse', () => {
  assert.deepEqual(externeAdressenFinden('url(data:font/woff2;base64,//8AAAA//8A//BB==)'), []);
  assert.deepEqual(externeAdressenFinden('url(/assets//x.png) url("/a//b.css")'), []);
  assert.deepEqual(externeAdressenFinden('<script>\n  // Setzt das Design vor dem Zeichnen.\n</script>'), []);
  assert.deepEqual(externeAdressenFinden(`<svg xmlns='//www.w3.org/2000/svg'></svg>`), []);
});
