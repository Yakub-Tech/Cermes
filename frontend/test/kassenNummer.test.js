import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kassenNummerAusText, kassenNummerDiesesGeraets } from '../src/kassenNummer.js';

function ersatzSpeicher(anfangswert) {
  const inhalt = {};
  if (anfangswert !== undefined) inhalt['cermes-kassen-nummer'] = anfangswert;
  return {
    inhalt,
    getItem(schluessel) {
      return schluessel in inhalt ? inhalt[schluessel] : null;
    },
    setItem(schluessel, wert) {
      inhalt[schluessel] = String(wert);
    },
  };
}

test('kassenNummerAusText erkennt die Ziffern 1 bis 9', () => {
  for (let ziffer = 1; ziffer <= 9; ziffer += 1) {
    assert.equal(kassenNummerAusText(String(ziffer)), ziffer);
  }
});

test('kassenNummerAusText lehnt alles andere mit null ab', () => {
  for (const wert of [null, undefined, '', '0', '10', 'x', '2.5', ' 2', '-1']) {
    assert.equal(kassenNummerAusText(wert), null, `Wert ${wert}`);
  }
});

test('ein gültiger Wert aus der Adresse gewinnt und wird gespeichert', () => {
  const speicher = ersatzSpeicher('3');
  assert.equal(kassenNummerDiesesGeraets('2', () => speicher), 2);
  assert.equal(speicher.inhalt['cermes-kassen-nummer'], '2');
});

test('ohne Wert in der Adresse gilt die gespeicherte Nummer', () => {
  const speicher = ersatzSpeicher('4');
  assert.equal(kassenNummerDiesesGeraets(null, () => speicher), 4);
});

test('ein ungültiger Wert in der Adresse wird ignoriert und nicht gespeichert', () => {
  const speicher = ersatzSpeicher('4');
  assert.equal(kassenNummerDiesesGeraets('12', () => speicher), 4);
  assert.equal(speicher.inhalt['cermes-kassen-nummer'], '4');
});

test('ohne Adresse und ohne gespeicherten Wert gilt Kasse 1', () => {
  assert.equal(kassenNummerDiesesGeraets(null, () => ersatzSpeicher()), 1);
});

test('ein kaputter gespeicherter Wert ergibt Kasse 1', () => {
  assert.equal(kassenNummerDiesesGeraets(null, () => ersatzSpeicher('kaputt')), 1);
});

test('ein nicht nutzbarer Speicher ergibt Kasse 1 bzw. die Nummer aus der Adresse', () => {
  const gesperrt = {
    getItem() { throw new Error('gesperrt'); },
    setItem() { throw new Error('gesperrt'); },
  };
  assert.equal(kassenNummerDiesesGeraets(null, () => gesperrt), 1);
  assert.equal(kassenNummerDiesesGeraets('5', () => gesperrt), 5);
});

test('wirft schon der Zugriff auf den Speicher selbst, ergibt das Kasse 1 bzw. die Nummer aus der Adresse', () => {
  const speicherGesperrt = () => { throw new Error('SecurityError'); };
  assert.equal(kassenNummerDiesesGeraets(null, speicherGesperrt), 1);
  assert.equal(kassenNummerDiesesGeraets('2', speicherGesperrt), 2);
});
