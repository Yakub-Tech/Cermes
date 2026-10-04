import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schriftgroesseFuerArtikelname } from '../src/komponenten/schriftgroesse.js';

function alteGroesseInRem(name) {
  if (name.length <= 14) return 0.65;
  if (name.length <= 19) return 0.55;
  return 0.45;
}

function groesseInRem(name) {
  return Number(schriftgroesseFuerArtikelname(name).match(/([\d.]+)rem/)[1]);
}

test('kurze Namen bekommen die größte Stufe, lange werden stufenweise kleiner', () => {
  assert.equal(schriftgroesseFuerArtikelname('Adana'), 'text-[0.8rem]');
  assert.equal(schriftgroesseFuerArtikelname('x'.repeat(14)), 'text-[0.8rem]');
  assert.equal(schriftgroesseFuerArtikelname('x'.repeat(15)), 'text-[0.58rem]');
  assert.equal(schriftgroesseFuerArtikelname('x'.repeat(19)), 'text-[0.58rem]');
  assert.equal(schriftgroesseFuerArtikelname('x'.repeat(20)), 'text-[0.46rem]');
  assert.equal(schriftgroesseFuerArtikelname('x'.repeat(24)), 'text-[0.46rem]');
});

test('kein Name wird kleiner dargestellt als vorher, ein längerer Name nie größer als ein kürzerer', () => {
  let vorherige = Infinity;
  for (let laenge = 1; laenge <= 24; laenge += 1) {
    const name = 'x'.repeat(laenge);
    assert.ok(groesseInRem(name) >= alteGroesseInRem(name), `Länge ${laenge} wäre kleiner als vorher`);
    assert.ok(groesseInRem(name) <= vorherige, `Länge ${laenge} wäre größer als ein kürzerer Name`);
    vorherige = groesseInRem(name);
  }
});

const EM_JE_ZEICHEN = 0.58;
const INNENBREITE_PX = 104;
test('auch der breiteste realistische Name passt bei jeder Länge bis 24 in die schmalste Karte', () => {
  for (let laenge = 1; laenge <= 24; laenge += 1) {
    const breite = laenge * EM_JE_ZEICHEN * groesseInRem('x'.repeat(laenge)) * 16;
    assert.ok(breite <= INNENBREITE_PX, `Länge ${laenge}: ${breite.toFixed(1)} px > ${INNENBREITE_PX} px`);
  }
});
