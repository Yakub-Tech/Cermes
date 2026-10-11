import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erzeugeNeuesteAntwort } from '../src/neuesteAntwort.js';

function offenerAbruf() {
  let liefern;
  let abweisen;
  const abruf = new Promise((resolve, reject) => { liefern = resolve; abweisen = reject; });
  return { abruf, liefern, abweisen };
}

test('eine später eintreffende ältere Antwort überschreibt die neuere nicht', async () => {
  const neueste = erzeugeNeuesteAntwort();
  const angezeigt = [];
  const a = offenerAbruf();
  const b = offenerAbruf();

  const wartenA = neueste('liste', a.abruf, (daten) => angezeigt.push(daten));
  const wartenB = neueste('liste', b.abruf, (daten) => angezeigt.push(daten));
  b.liefern('neu');
  await wartenB;
  a.liefern('alt');
  await wartenA;

  assert.deepEqual(angezeigt, ['neu']);
});

test('die Antworten in richtiger Reihenfolge werden alle übernommen', async () => {
  const neueste = erzeugeNeuesteAntwort();
  const angezeigt = [];

  await neueste('liste', Promise.resolve(1), (daten) => angezeigt.push(daten));
  await neueste('liste', Promise.resolve(2), (daten) => angezeigt.push(daten));

  assert.deepEqual(angezeigt, [1, 2]);
});

test('Abrufe mit unterschiedlichem Schlüssel verdrängen sich nicht', async () => {
  const neueste = erzeugeNeuesteAntwort();
  const angezeigt = [];
  const tage = offenerAbruf();

  const wartenTage = neueste('tage', tage.abruf, (daten) => angezeigt.push(daten));
  await neueste('artikel', Promise.resolve('artikel'), (daten) => angezeigt.push(daten));
  tage.liefern('tage');
  await wartenTage;

  assert.deepEqual(angezeigt, ['artikel', 'tage']);
});

test('ein Fehlschlag wird an den Aufrufer weitergegeben', async () => {
  const neueste = erzeugeNeuesteAntwort();
  await assert.rejects(
    neueste('liste', Promise.reject(new Error('kaputt')), () => {}),
    /kaputt/
  );
});

test('der Fehlerzustand meldet einen Fehlschlag und danach den Erfolg des neuesten Abrufs', async () => {
  const meldungen = [];
  const neueste = erzeugeNeuesteAntwort((fehlgeschlagen) => meldungen.push(fehlgeschlagen));

  await neueste('liste', Promise.reject(new Error('kaputt')), () => {}).catch(() => {});
  await neueste('liste', Promise.resolve(1), () => {});

  assert.deepEqual(meldungen, [true, false]);
});

test('ein überholter Fehlschlag zählt nicht als Fehler', async () => {
  const meldungen = [];
  const neueste = erzeugeNeuesteAntwort((fehlgeschlagen) => meldungen.push(fehlgeschlagen));
  const alt = offenerAbruf();

  const wartenAlt = neueste('liste', alt.abruf, () => {}).catch(() => {});
  await neueste('liste', Promise.resolve(1), () => {});
  alt.abruf.catch(() => {});
  alt.abweisen(new Error('zu spät'));
  await wartenAlt;

  assert.deepEqual(meldungen, []);
});

test('der Fehlerzustand bleibt, solange irgendeine Datenquelle fehlgeschlagen ist', async () => {
  const meldungen = [];
  const neueste = erzeugeNeuesteAntwort((fehlgeschlagen) => meldungen.push(fehlgeschlagen));

  await neueste('a', Promise.reject(new Error('x')), () => {}).catch(() => {});
  await neueste('b', Promise.resolve(1), () => {});
  await neueste('a', Promise.resolve(1), () => {});

  assert.deepEqual(meldungen, [true, false]);
});
