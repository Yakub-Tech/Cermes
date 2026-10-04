import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kontrastverhaeltnis, lesbareSchriftfarbe, blasserFarbe } from '../src/komponenten/farbe.js';

const gerundet = (zahl) => Math.round(zahl * 100) / 100;

test('Schwarz auf Weiß hat den größten Kontrast, gleiche Farben den kleinsten', () => {
  assert.equal(gerundet(kontrastverhaeltnis('#000000', '#ffffff')), 21);
  assert.equal(gerundet(kontrastverhaeltnis('#ffffff', '#ffffff')), 1);
});

test('der Kontrast hängt nicht von der Reihenfolge ab', () => {
  assert.equal(kontrastverhaeltnis('#218358', '#ffffff'), kontrastverhaeltnis('#ffffff', '#218358'));
});

test('bekannte Werte stimmen', () => {
  assert.equal(gerundet(kontrastverhaeltnis('#ffffff', '#218358')), 4.72);
  assert.equal(gerundet(kontrastverhaeltnis('#ffffff', '#16a34a')), 3.3);
});

test('mittlere Artikelfarben bekommen die Schrift mit dem besseren Kontrast', () => {
  assert.equal(lesbareSchriftfarbe('#16a34a'), '#111111');
  assert.equal(lesbareSchriftfarbe('#dd6b20'), '#111111');
  assert.equal(lesbareSchriftfarbe('#ef4444'), '#111111');
  assert.equal(lesbareSchriftfarbe('#3b82f6'), '#111111');
});

test('kräftig dunkle Farben bleiben bei weißer Schrift', () => {
  assert.equal(lesbareSchriftfarbe('#b53030'), '#ffffff');
  assert.equal(lesbareSchriftfarbe('#2563a6'), '#ffffff');
  assert.equal(lesbareSchriftfarbe('#7c3aed'), '#ffffff');
  assert.equal(lesbareSchriftfarbe('#0a0a0a'), '#ffffff');
});

test('helle Farben bleiben bei dunkler Schrift', () => {
  assert.equal(lesbareSchriftfarbe('#fdfdfd'), '#111111');
  assert.equal(lesbareSchriftfarbe('#f5c211'), '#111111');
});

test('Großbuchstaben im Farbwert ändern nichts', () => {
  assert.equal(lesbareSchriftfarbe('#B53030'), lesbareSchriftfarbe('#b53030'));
});

test('bei jedem Grauwert erreicht die gewählte Schrift mindestens 4,3 zu 1', () => {
  for (let wert = 0; wert <= 255; wert += 1) {
    const kanal = wert.toString(16).padStart(2, '0');
    const farbe = `#${kanal}${kanal}${kanal}`;
    assert.ok(kontrastverhaeltnis(farbe, lesbareSchriftfarbe(farbe)) >= 4.3, `zu wenig Kontrast bei ${farbe}`);
  }
});

test('blasserFarbe nimmt die Sättigung zurück und lässt Grautöne unverändert', () => {
  assert.equal(blasserFarbe('#808080'), '#808080');
  assert.equal(blasserFarbe('#ff0000', 0), '#ff0000');
  const blass = blasserFarbe('#ff0000', 0.5);
  assert.equal(blass, '#a62626');
});

test('Schrift auf der blassen Kartenfarbe bleibt für jede Artikelfarbe bei mindestens 4,5 zu 1', () => {
  for (const farbe of ['#fdfdfd', '#0a0a0a', '#b53030', '#2563a6', '#16a34a', '#ef4444', '#3b82f6', '#dd6b20', '#7c3aed', '#f5c211']) {
    const blass = blasserFarbe(farbe);
    assert.ok(kontrastverhaeltnis(blass, lesbareSchriftfarbe(blass)) >= 4.5, farbe);
  }
});
