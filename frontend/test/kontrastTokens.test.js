import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kontrastverhaeltnis } from '../src/komponenten/farbe.js';

const css = readFileSync(new URL('../src/design/farben.css', import.meta.url), 'utf8');
const THEMES = {
  Dunkel: ":root,\n:root[data-design='dunkel'] {",
  Hell: ":root[data-design='hell'] {",
};

function farbwerte(blockAnfang) {
  const start = css.indexOf(blockAnfang);
  assert.notEqual(start, -1, `Block fehlt: ${blockAnfang}`);
  const block = css.slice(start, css.indexOf('}', start));
  const werte = {};
  for (const treffer of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    werte[treffer[1]] = treffer[2];
  }
  return werte;
}

for (const [name, blockAnfang] of Object.entries(THEMES)) {
  test(`${name}: weiße Schrift auf gefüllten Flächen hat mindestens 4,5 zu 1`, () => {
    const werte = farbwerte(blockAnfang);
    for (const token of ['--erfolg-fuellung', '--gefahr-fuellung', '--gefahr-hover']) {
      assert.ok(werte[token], `${token} fehlt`);
      assert.ok(kontrastverhaeltnis('#ffffff', werte[token]) >= 4.5, `${token} hat zu wenig Kontrast mit Weiß`);
    }
  });
}
