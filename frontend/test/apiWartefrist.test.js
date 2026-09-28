import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiGet, apiPost } from '../src/api.js';

function haengendesFetch(_pfad, optionen) {
  return new Promise((_resolve, reject) => {
    optionen.signal.addEventListener('abort', () => reject(new DOMException('abgebrochen', 'AbortError')));
  });
}

test('ein nie antwortender Abruf endet nach der Wartefrist mit deutschem Hinweis', async () => {
  globalThis.fetch = haengendesFetch;
  await assert.rejects(apiGet('/api/x', { wartezeitMs: 20 }), /antwortet nicht/);
});

test('bei einem nie antwortenden Schreibvorgang wird vor dem Wiederholen gewarnt', async () => {
  globalThis.fetch = haengendesFetch;
  await assert.rejects(apiPost('/api/x', {}, { wartezeitMs: 20 }), /angekommen/);
});

test('eine rechtzeitige Antwort wird normal geliefert', async () => {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ a: 1 }) });
  assert.deepEqual(await apiGet('/api/x', { wartezeitMs: 1000 }), { a: 1 });
});

test('eine Wartefrist beim Lesen der Antwort gilt nicht als Erfolg', async () => {
  globalThis.fetch = (_pfad, optionen) => Promise.resolve({
    ok: true,
    status: 200,
    json: () => new Promise((_resolve, reject) => {
      optionen.signal.addEventListener('abort', () => reject(new DOMException('abgebrochen', 'AbortError')));
    }),
  });
  await assert.rejects(apiGet('/api/x', { wartezeitMs: 20 }), /antwortet nicht/);
});

test('eine Erfolgsantwort mit abgebrochenem Inhalt gilt nicht als Erfolg', async () => {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new TypeError('terminated'); } });
  await assert.rejects(apiGet('/api/x'), /unvollständig/);
});

test('eine Erfolgsantwort mit kaputtem JSON beim Schreiben lässt den Ausgang offen', async () => {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected end'); } });
  await assert.rejects(apiPost('/api/x', {}), (f) => {
    assert.equal(f.status, undefined);
    assert.match(f.message, /angekommen/);
    return true;
  });
});

test('eine Fehlerantwort mit unlesbarem Inhalt behält den Standardtext und den Status', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => { throw new SyntaxError('x'); } });
  await assert.rejects(apiGet('/api/x'), (f) => {
    assert.equal(f.status, 500);
    assert.match(f.message, /unbekannter Fehler/);
    return true;
  });
});

test('eine Antwort ohne Inhalt (204) bleibt erlaubt', async () => {
  globalThis.fetch = async () => ({ ok: true, status: 204 });
  assert.equal(await apiPost('/api/x', {}), null);
});
