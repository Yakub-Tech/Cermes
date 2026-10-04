import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as ansichtFarben from '../src/admin/statistikAnsichtFarben.js';

const css = readFileSync(new URL('../src/design/farben.css', import.meta.url), 'utf8');
const DUNKEL_BLOCK = ":root,\n:root[data-design='dunkel'] {";
const HELL_BLOCK = ":root[data-design='hell'] {";

function blockInhalt(blockAnfang) {
  const start = css.indexOf(blockAnfang);
  assert.notEqual(start, -1, `Block fehlt: ${blockAnfang}`);
  return css.slice(start, css.indexOf('}', start));
}

test('jede Diagrammfarbe der Ansicht verweist auf eine Variable, die beide Themes definieren', () => {
  const eintraege = Object.entries(ansichtFarben);
  assert.ok(eintraege.length >= 7, 'zu wenige Diagrammfarben');
  for (const [name, wert] of eintraege) {
    const treffer = /^var\((--[a-z0-9-]+)\)$/.exec(wert);
    assert.ok(treffer, `${name} muss ein var(--...)-Verweis sein, ist aber ${wert}`);
    for (const block of [DUNKEL_BLOCK, HELL_BLOCK]) {
      assert.match(blockInhalt(block), new RegExp(`${treffer[1]}\\s*:`), `${treffer[1]} fehlt in ${block}`);
    }
  }
});
