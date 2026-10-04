import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DESIGN_SCHLUESSEL } from '../src/design/designSpeicher.js';

test('index.html setzt das gespeicherte Design vor dem ersten Zeichnen', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes(`'${DESIGN_SCHLUESSEL}'`), 'Schlüssel fehlt oder weicht ab');
  assert.ok(html.includes('dataset.design'), 'das Attribut wird nicht gesetzt');
  const skriptPosition = html.indexOf('dataset.design');
  assert.ok(skriptPosition < html.indexOf('/src/main.jsx'), 'Skript muss vor dem App-Skript stehen');
});
