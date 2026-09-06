import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pruefeBloecke, sortiereNachVon, ermittleVergabeUndNeuePosition, ermittleStatus, hinweisText,
} from '../src/nummernbloecke.js';

test('pruefeBloecke lehnt leere Liste ab', () => {
  assert.match(pruefeBloecke([]), /mindestens einen Nummernblock/);
});

test('pruefeBloecke lehnt Block mit bis kleiner als von ab', () => {
  assert.match(pruefeBloecke([{ von: 100, bis: 50 }]), /Bis.*mindestens.*Von|Von.*Bis/i);
});

test('pruefeBloecke lehnt sich überschneidende Blöcke ab', () => {
  const fehler = pruefeBloecke([{ von: 1, bis: 100 }, { von: 50, bis: 150 }]);
  assert.match(fehler, /überschneiden/);
});

test('pruefeBloecke akzeptiert nicht überschneidende Blöcke in beliebiger Reihenfolge', () => {
  const fehler = pruefeBloecke([{ von: 240, bis: 300 }, { von: 1, bis: 100 }, { von: 161, bis: 200 }]);
  assert.equal(fehler, null);
});

test('pruefeBloecke akzeptiert direkt aneinandergrenzende Blöcke', () => {
  const fehler = pruefeBloecke([{ von: 1, bis: 100 }, { von: 101, bis: 200 }]);
  assert.equal(fehler, null);
});

test('sortiereNachVon sortiert unabhängig von der Eingabereihenfolge', () => {
  const sortiert = sortiereNachVon([{ von: 240, bis: 300 }, { von: 1, bis: 100 }, { von: 161, bis: 200 }]);
  assert.deepEqual(sortiert.map((b) => b.von), [1, 161, 240]);
});

test('Nummernvergabe: normale Vergabe innerhalb eines Blocks zählt einfach hoch', () => {
  const bloecke = sortiereNachVon([{ von: 1, bis: 100 }]);
  const ergebnis = ermittleVergabeUndNeuePosition(bloecke, 5);
  assert.deepEqual(ergebnis, { nummer: 5, neuePosition: 6 });
});

test('Nummernvergabe: am Ende eines Blocks springt die Position zum nächsten Block', () => {
  const bloecke = sortiereNachVon([{ von: 1, bis: 100 }, { von: 161, bis: 200 }]);
  const ergebnis = ermittleVergabeUndNeuePosition(bloecke, 100);
  assert.deepEqual(ergebnis, { nummer: 100, neuePosition: 161 });
});

test('Nummernvergabe: am Ende des letzten Blocks wird unbegrenzt weitergezählt', () => {
  const bloecke = sortiereNachVon([{ von: 1, bis: 100 }]);
  const ergebnis = ermittleVergabeUndNeuePosition(bloecke, 100);
  assert.deepEqual(ergebnis, { nummer: 100, neuePosition: 101 });
});

test('Nummernvergabe: Position außerhalb aller Blöcke wird trotzdem vergeben (nie blockieren)', () => {
  const bloecke = sortiereNachVon([{ von: 1, bis: 100 }]);
  const ergebnis = ermittleVergabeUndNeuePosition(bloecke, 150);
  assert.deepEqual(ergebnis, { nummer: 150, neuePosition: 151 });
});

test('Nummernvergabe: Position in einer Lücke springt zum nächsten bekannten Block, statt Nummern ohne Kärtchen zu vergeben', () => {
  const bloecke = sortiereNachVon([{ von: 1, bis: 100 }, { von: 161, bis: 200 }]);
  const ergebnis = ermittleVergabeUndNeuePosition(bloecke, 130);
  assert.deepEqual(ergebnis, { nummer: 161, neuePosition: 162 });
});

test('ermittleStatus: ok, wenn mehr als 10 Kärtchen im aktuellen Block übrig sind', () => {
  const bloecke = sortiereNachVon([{ von: 1, bis: 100 }]);
  assert.deepEqual(ermittleStatus(bloecke, 50),
    { status: 'ok', verbleibend: 51, blockBis: 100, naechsterBlock: null });
});

test('ermittleStatus: block_wechseln, wenn Block bald zu Ende ist und der nächste Block schon da ist', () => {
  const bloecke = sortiereNachVon([{ von: 1, bis: 100 }, { von: 161, bis: 200 }]);
  assert.deepEqual(ermittleStatus(bloecke, 95),
    { status: 'block_wechseln', verbleibend: 6, blockBis: 100, naechsterBlock: { von: 161, bis: 200 } });
});

test('ermittleStatus: block_eintragen, wenn Block bald zu Ende ist und kein nächster Block da ist', () => {
  const bloecke = sortiereNachVon([{ von: 1, bis: 100 }]);
  assert.deepEqual(ermittleStatus(bloecke, 95),
    { status: 'block_eintragen', verbleibend: 6, blockBis: 100, naechsterBlock: null });
});

test('ermittleStatus: aufgebraucht, wenn die Position außerhalb aller Blöcke liegt', () => {
  const bloecke = sortiereNachVon([{ von: 1, bis: 100 }]);
  assert.deepEqual(ermittleStatus(bloecke, 150),
    { status: 'aufgebraucht', verbleibend: 0, blockBis: null, naechsterBlock: null });
});

test('ermittleStatus: Position in einer Lücke wird wie der Anfang des nächsten Blocks bewertet', () => {
  const bloecke = sortiereNachVon([{ von: 1, bis: 100 }, { von: 161, bis: 200 }]);
  assert.deepEqual(ermittleStatus(bloecke, 130),
    { status: 'ok', verbleibend: 40, blockBis: 200, naechsterBlock: null });
});

test('hinweisText: ok liefert keinen Text', () => {
  assert.equal(hinweisText('ok', { verbleibend: 51, blockBis: 100, naechsterBlock: null }), null);
});

test('hinweisText: block_wechseln nennt die Nummern des nächsten Blocks statt "Rolle" zu sagen', () => {
  const text = hinweisText('block_wechseln',
    { verbleibend: 6, blockBis: 100, naechsterBlock: { von: 161, bis: 200 } });
  assert.doesNotMatch(text, /rolle/i);
  assert.match(text, /161/);
  assert.match(text, /200/);
  assert.match(text, /6 Kärtchen/);
});

test('hinweisText: block_eintragen sagt, dass kein nächster Block bekannt ist', () => {
  const text = hinweisText('block_eintragen', { verbleibend: 6, blockBis: 100, naechsterBlock: null });
  assert.doesNotMatch(text, /rolle/i);
  assert.match(text, /neuen Nummernblock eintragen/);
});

test('hinweisText: aufgebraucht erklärt, dass ungeprüft weitergezählt wird', () => {
  const text = hinweisText('aufgebraucht', { verbleibend: 0, blockBis: null, naechsterBlock: null });
  assert.match(text, /kein gültiger Nummernblock|ungeprüft weitergezählt/i);
});
