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

for (const [name, blockAnfang] of Object.entries(THEMES)) {
  test(`${name}: der Rand von Eingabefeldern hat mindestens 3 zu 1`, () => {
    const werte = farbwerte(blockAnfang);
    assert.ok(werte['--feldrahmen'], '--feldrahmen fehlt');
    assert.ok(kontrastverhaeltnis(werte['--feldrahmen'], werte['--flaeche']) >= 3, 'zu wenig gegen die Karte');
    assert.ok(kontrastverhaeltnis(werte['--feldrahmen'], werte['--flaeche-hell']) >= 3, 'zu wenig gegen die Feldfläche');
  });
}

function mitDeckkraft(vordergrund, untergrund, deckkraft) {
  let ergebnis = '#';
  for (const stelle of [1, 3, 5]) {
    const oben = parseInt(vordergrund.slice(stelle, stelle + 2), 16);
    const unten = parseInt(untergrund.slice(stelle, stelle + 2), 16);
    ergebnis += Math.round(oben * deckkraft + unten * (1 - deckkraft)).toString(16).padStart(2, '0');
  }
  return ergebnis;
}

const UNTERGRUENDE = ['--grund', '--flaeche', '--flaeche-hell'];
const SIGNALE = [
  { name: 'Rot', schrift: '--gefahr-schrift', flaeche: '--gefahr' },
  { name: 'Grün', schrift: '--erfolg-schrift', flaeche: '--erfolg' },
];

for (const signal of SIGNALE) {
  for (const [name, blockAnfang] of Object.entries(THEMES)) {
    test(`${name}: ${signal.name}e Schrift im Hinweiskasten hat mindestens 4,5 zu 1`, () => {
      const werte = farbwerte(blockAnfang);
      for (const untergrund of UNTERGRUENDE) {
        const kasten = mitDeckkraft(werte[signal.flaeche], werte[untergrund], 0.15);
        const verhaeltnis = kontrastverhaeltnis(werte[signal.schrift], kasten);
        assert.ok(verhaeltnis >= 4.5, `${signal.schrift} auf ${untergrund}: nur ${verhaeltnis.toFixed(2)}`);
      }
    });
  }
}
