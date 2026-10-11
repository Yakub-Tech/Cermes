import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: [fileURLToPath(new URL('../src/kasse/ArtikelKachel.jsx', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  jsx: 'automatic',
});
const { default: ArtikelKachel } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

function kachelRendern(bildUrl) {
  return renderToStaticMarkup(createElement(ArtikelKachel, {
    artikel: { id: 1, name: 'Burger', farbe: '#f76b35', preis_cent: 800, beilagen: [], bild_url: bildUrl },
    sprache: 'de',
    texte: { sonderwunsch: 'Sonderwunsch', ausverkauftMelden: 'Ausverkauft melden' },
    laeuft: false,
  }));
}

test('Kassenkachel zeigt das Artikelbild und behält Name und Preis', () => {
  const html = kachelRendern('/artikelbilder/demo.jpg');
  assert.match(html, /background-image:.*\/artikelbilder\/demo\.jpg/);
  assert.match(html, />Burger</);
  assert.match(html, />8,00 €</);
});

test('Kassenkachel ohne Artikelbild bleibt ohne Bildadresse', () => {
  const html = kachelRendern(null);
  assert.doesNotMatch(html, /background-image/);
  assert.match(html, />Burger</);
  assert.match(html, />8,00 €</);
});
