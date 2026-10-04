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

test('Fehlerlink der Bibliothek und Beispieladresse sind erlaubt, andere Adressen im Programmtext werden gefunden', () => {
  const js = { istJs: true };
  assert.deepEqual(externeAdressenFinden('"Siehe https://reactjs.org/docs/error"', js), []);
  assert.deepEqual(externeAdressenFinden('placeholder="http://192.168.1.50:8080/tv" und https://192.168.1.50/x', js), []);
  assert.deepEqual(externeAdressenFinden('fetch("https://cdn.example.com/x.js")'), ['https://cdn.example.com/x.js']);
});

test('JS-Modus: Adressen ohne Protokoll sind keine Adresse, mit Protokoll weiter', () => {
  const js = 'ladeDatei("//data/Helvetica.afm"); fetch("https://cdn.example.com/x.js")';
  assert.deepEqual(externeAdressenFinden(js, { istJs: true }), ['https://cdn.example.com/x.js']);
  assert.deepEqual(externeAdressenFinden('"//data/Helvetica.afm"'), ['//data/Helvetica.afm']);
});

test('Namensräume, Quelllinks der Bibliotheken und der QR-Code-Text sind erlaubt', () => {
  const text = `"http://purl.org/dc/terms/" "http://schemas.microsoft.com/office/x" "http://schemas.openxmlformats.org/a"
    "http://ns.adobe.com/xap/1.0/" "http://www.aiim.org/pdfa/ns/id/" "https://github.com/zloirock/core-js"
    "https://stuk.github.io/jszip/x.html" "https://tools.ietf.org/html/rfc4013" "http://fb.me/use-check-prop-types" \`http://\${i}\``;
  assert.deepEqual(externeAdressenFinden(text, { istJs: true }), []);
  assert.deepEqual(externeAdressenFinden('"https://github.com.boese.de/x"', { istJs: true }), ['https://github.com.boese.de/x']);
});

test('Die JS-Erlaubnisliste gilt nicht für HTML und CSS', () => {
  const css = '@import url(https://github.com/zloirock/x.css);';
  assert.deepEqual(externeAdressenFinden(css), ['https://github.com/zloirock/x.css']);
  assert.deepEqual(externeAdressenFinden(css, { istJs: true }), []);
  assert.deepEqual(externeAdressenFinden('<img src="http://192.168.1.50/a.png">'), ['http://192.168.1.50/a.png']);
});

test('JS-Modus: nur die bekannten Repo-Pfade sind erlaubt, andere Pfade auf demselben Host nicht', () => {
  const js = { istJs: true };
  assert.deepEqual(externeAdressenFinden('"https://github.com/boese/x.js" "https://fb.me/x.js" "https://tools.ietf.org/x.js"', js), [
    'https://fb.me/x.js',
    'https://github.com/boese/x.js',
    'https://tools.ietf.org/x.js',
  ]);
  const bekannt = `"https://github.com/zloirock/core-js" "https://github.com/crypto-browserify/crypto-browserify"
    "https://github.com/indutny/elliptic/issues" "https://github.com/exceljs/exceljs/blob/x" "https://github.com/uuidjs/uuid#a"
    "https://stuk.github.io/jszip/documentation/x.html" "https://tools.ietf.org/html/rfc3454#section-6" "http://fb.me/use-check-prop-types"`;
  assert.deepEqual(externeAdressenFinden(bekannt, js), []);
});

test('JS-Modus: protokollrelative Adresse mit Hostname und Punkt wird gefunden, Dateipfade ohne Punkt im Host nicht', () => {
  const js = { istJs: true };
  assert.deepEqual(externeAdressenFinden('x = "//cdn.example.com/x.js"; y = `//cdn2.example.com/a.js`', js), [
    '//cdn.example.com/x.js',
    '//cdn2.example.com/a.js',
  ]);
  assert.deepEqual(externeAdressenFinden('"//data/Helvetica.afm" "//data/Courier.afm"', js), []);
  assert.deepEqual(externeAdressenFinden('"//192.168.1.50/tv" "//www.aiim.org/x"', js), []);
  assert.deepEqual(externeAdressenFinden('"//192.168.1.50/tv"'), ['//192.168.1.50/tv']);
});

test('JS-Modus: Backtick beendet eine Adresse, aneinandergehängte Template-Strings verstecken nichts', () => {
  const js = { istJs: true };
  assert.deepEqual(externeAdressenFinden('a=`http://${h}/x`,b=`https://cdn.evil.com/a.js`', js), ['https://cdn.evil.com/a.js']);
  assert.deepEqual(externeAdressenFinden('a=`http://localhost/`+`https://cdn.evil.com/a.js`', js), ['https://cdn.evil.com/a.js']);
});

test('JS-Modus: fb.me-Adresse ist am Ende verankert', () => {
  assert.deepEqual(externeAdressenFinden('"https://fb.me/use-check-prop-typesBOESE"', { istJs: true }), [
    'https://fb.me/use-check-prop-typesBOESE',
  ]);
});
