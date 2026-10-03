import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/design/theme.css', import.meta.url), 'utf8');

function warnPulsBlock() {
  const start = css.indexOf('@keyframes warn-puls');
  assert.notEqual(start, -1, '@keyframes warn-puls fehlt');
  return css.slice(start, css.indexOf('\n}', start));
}

test('Warn-Puls pulsiert in der Hauptfarbe', () => {
  assert.match(warnPulsBlock(), /var\(--haupt\)/);
});

test('Warn-Puls enthält keine feste Farbe, damit er in beiden Themes neutral bleibt', () => {
  assert.doesNotMatch(warnPulsBlock(), /#[0-9a-fA-F]{3,8}\b|rgba?\(|orange/i);
});

test('Die Klasse warn-puls hängt an der Animation warn-puls', () => {
  assert.match(css, /\.warn-puls\s*\{\s*animation:\s*warn-puls/);
});
