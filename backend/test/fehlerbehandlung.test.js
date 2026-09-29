import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { fehlerBehandlung } from '../src/fehlerBehandlung.js';

const UNERWARTETER_FEHLER = 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.';
const BACKEND_ORDNER = new URL('..', import.meta.url).pathname;

function pruefeSauberenFehler(antwort, erwarteterStatus, erwarteterSatz) {
  assert.equal(antwort.status, erwarteterStatus);
  assert.match(antwort.headers['content-type'], /application\/json/);
  assert.equal(antwort.body.fehler, erwarteterSatz);
  assert.doesNotMatch(antwort.text, /<html|Error|node_modules|\.js|\bat\b/i);
  assert.ok(!antwort.text.includes(BACKEND_ORDNER));
}

async function mitAbgefangenemProtokoll(sendeAnfrage) {
  const protokoll = mock.method(console, 'error', () => {});
  try {
    const antwort = await sendeAnfrage();
    return { antwort, aufrufe: [...protokoll.mock.calls] };
  } finally {
    protokoll.mock.restore();
  }
}

test('Unlesbares JSON ergibt 400 mit deutschem Satz ohne technische Details', async () => {
  const { app } = frischeApp();

  const antwort = await request(app).post('/api/login')
    .set('Content-Type', 'application/json')
    .send('{kaputt');

  pruefeSauberenFehler(antwort, 400,
    'Die Anfrage konnte nicht gelesen werden. Bitte die Seite neu laden und es noch einmal versuchen.');
});

test('Zu große Anfrage ergibt 413 mit deutschem Satz ohne technische Details', async () => {
  const { app } = frischeApp();

  const antwort = await request(app).post('/api/login')
    .send({ benutzername: 'x'.repeat(150 * 1024) });

  pruefeSauberenFehler(antwort, 413,
    'Die gesendeten Daten sind zu groß und wurden abgelehnt.');
});

test('Anfrage mit unbekannter Inhaltskodierung behält den Status 415 und bekommt einen deutschen Satz', async () => {
  const { app } = frischeApp();

  const antwort = await request(app).post('/api/login')
    .set('Content-Type', 'application/json')
    .set('Content-Encoding', 'gibt-es-nicht')
    .send('{}');

  pruefeSauberenFehler(antwort, 415, 'Die Anfrage konnte nicht verarbeitet werden.');
});

test('Login mit einem Objekt als Benutzername ergibt 500 mit dem allgemeinen deutschen Satz', async () => {
  const { app } = frischeApp();

  const { antwort, aufrufe } = await mitAbgefangenemProtokoll(
    () => request(app).post('/api/login').send({ benutzername: { a: 1 } })
  );

  pruefeSauberenFehler(antwort, 500, UNERWARTETER_FEHLER);
  assert.equal(aufrufe.length, 1);
  assert.match(aufrufe[0].arguments[0], /POST \/api\/login/);
  assert.ok(aufrufe[0].arguments[1] instanceof Error);
});

test('Benutzer anlegen mit einer Zahl als Benutzername ergibt 500 mit dem allgemeinen deutschen Satz', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  const { antwort } = await mitAbgefangenemProtokoll(
    () => admin.post('/api/benutzer').send({ benutzername: 12345, passwort: '12345678', rolle: 'kasse' })
  );

  pruefeSauberenFehler(antwort, 500, UNERWARTETER_FEHLER);
});

test('Hat die Antwort schon begonnen, reicht die Fehlerbehandlung den Fehler an Express weiter', async () => {
  const fehler = new Error('mitten in der Antwort');
  let weitergereicht = null;
  const antwort = {
    headersSent: true,
    status() { throw new Error('darf nicht mehr antworten'); },
  };

  fehlerBehandlung(fehler, { method: 'GET', path: '/x' }, antwort, (f) => { weitergereicht = f; });

  assert.equal(weitergereicht, fehler);
});
