import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/design/farben.css', import.meta.url), 'utf8');
const DUNKEL_BLOCK = ":root,\n:root[data-design='dunkel'] {";
const HELL_BLOCK = ":root[data-design='hell'] {";

function variablenImBlock(blockAnfang) {
  const start = css.indexOf(blockAnfang);
  assert.notEqual(start, -1, `Block fehlt: ${blockAnfang}`);
  const block = css.slice(start, css.indexOf('}', start));
  return [...block.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((treffer) => treffer[1]).sort();
}

test('Dunkel und Hell definieren dieselben Variablen', () => {
  const dunkel = variablenImBlock(DUNKEL_BLOCK);
  const hell = variablenImBlock(HELL_BLOCK);
  assert.ok(dunkel.length >= 16, 'zu wenige Variablen im Dunkel-Block');
  assert.deepEqual(hell, dunkel);
});

test('jeder Verweis in @theme inline zeigt auf eine irgendwo definierte Variable', () => {
  const definiert = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((treffer) => treffer[1]));
  const start = css.indexOf('@theme inline {');
  assert.notEqual(start, -1, '@theme inline fehlt');
  const block = css.slice(start, css.indexOf('\n}', start));
  const verweise = [...block.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((treffer) => treffer[1]);
  assert.ok(verweise.length >= 25, 'zu wenige Verweise');
  for (const name of verweise) {
    assert.ok(definiert.has(name), `${name} ist nicht definiert`);
  }
});

test('beide Themes setzen color-scheme, damit Bildlaufleisten und Eingaben passen', () => {
  assert.match(css, /data-design='dunkel'\]\s*\{[^}]*color-scheme:\s*dark/);
  assert.match(css, /data-design='hell'\]\s*\{[^}]*color-scheme:\s*light/);
});

const theme = readFileSync(new URL('../src/design/theme.css', import.meta.url), 'utf8');

test('die alte Alias-Brücke ist gelöscht', () => {
  const alteVariable = /--color-(blau|navy|gruen|akzent|weinrot)(-hell|-blass|-text)?\s*:/;
  assert.doesNotMatch(css, alteVariable);
  assert.doesNotMatch(css, /Alias-Brücke/);
});

test('theme.css kennt die alte Klasse akzentrand nicht mehr', () => {
  assert.doesNotMatch(theme, /akzentrand/);
  assert.match(theme, /\.trennlinie\s*\{/);
});
