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
