import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { erstelleLiveVerbindung } from '../src/liveVerbindung.js';

function erstelleFalschenSocket() {
  const sockets = [];
  const socketErzeugen = () => {
    const socket = { geschlossen: false, close() { this.geschlossen = true; } };
    sockets.push(socket);
    return socket;
  };
  return { sockets, socketErzeugen };
}

function nachricht(typ) {
  return { data: JSON.stringify({ typ }) };
}

test('Eine Verbindung für alle Abonnenten, Rückruf nur bei passendem Ereignis', () => {
  const { sockets, socketErzeugen } = erstelleFalschenSocket();
  const verbindung = erstelleLiveVerbindung(socketErzeugen);
  const kaertchen = [];
  const logo = [];
  verbindung.abonnieren(['kaertchen'], () => kaertchen.push(1));
  verbindung.abonnieren(['logo'], () => logo.push(1));
  assert.equal(sockets.length, 1);

  sockets[0].onopen();
  assert.equal(kaertchen.length, 1);
  assert.equal(logo.length, 1);

  sockets[0].onmessage(nachricht('kaertchen'));
  assert.equal(kaertchen.length, 2);
  assert.equal(logo.length, 1);
});

test('Ohne Nachricht innerhalb der Frist gilt die Verbindung als unterbrochen und wird neu aufgebaut', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { sockets, socketErzeugen } = erstelleFalschenSocket();
    const verbindung = erstelleLiveVerbindung(socketErzeugen);
    let nachgeladen = 0;
    const zustaende = [];
    verbindung.abonnieren(['kaertchen'], () => nachgeladen++);
    verbindung.statusAbonnieren((verbunden) => zustaende.push(verbunden));

    sockets[0].onopen();
    assert.equal(verbindung.istVerbunden(), true);

    mock.timers.tick(39000);
    assert.equal(verbindung.istVerbunden(), true);
    sockets[0].onmessage(nachricht('herzschlag'));
    mock.timers.tick(39000);
    assert.equal(verbindung.istVerbunden(), true, 'Herzschlag setzt die Frist zurück');

    mock.timers.tick(2000);
    assert.equal(verbindung.istVerbunden(), false);
    assert.equal(sockets[0].geschlossen, true);
    assert.deepEqual(zustaende, [true, false]);

    mock.timers.tick(2000);
    assert.equal(sockets.length, 2);
    sockets[1].onopen();
    assert.equal(nachgeladen, 2, 'Nach dem Wiederverbinden wird nachgeladen');
    assert.equal(verbindung.istVerbunden(), true);
  } finally {
    mock.timers.reset();
  }
});

test('Ein spätes Schließen des alten Sockets baut keine zweite Verbindung auf', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { sockets, socketErzeugen } = erstelleFalschenSocket();
    const verbindung = erstelleLiveVerbindung(socketErzeugen);
    verbindung.abonnieren(['kaertchen'], () => {});
    const alterSocket = sockets[0];
    alterSocket.onopen();
    mock.timers.tick(41000);
    alterSocket.onclose?.();
    mock.timers.tick(5000);
    assert.equal(sockets.length, 2);
  } finally {
    mock.timers.reset();
  }
});

test('Nach dem letzten Abbestellen wird die Verbindung geschlossen und nicht neu aufgebaut', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { sockets, socketErzeugen } = erstelleFalschenSocket();
    const verbindung = erstelleLiveVerbindung(socketErzeugen);
    const abbestellen = verbindung.abonnieren(['kaertchen'], () => {});
    sockets[0].onopen();
    abbestellen();
    assert.equal(sockets[0].geschlossen, true);
    mock.timers.tick(100000);
    assert.equal(sockets.length, 1);
  } finally {
    mock.timers.reset();
  }
});

test('Wer sich bei bereits offener Verbindung anmeldet, lädt sofort einmal nach', () => {
  const { sockets, socketErzeugen } = erstelleFalschenSocket();
  const verbindung = erstelleLiveVerbindung(socketErzeugen);
  verbindung.abonnieren(['logo'], () => {});
  sockets[0].onopen();

  let spaeterAngemeldet = 0;
  verbindung.abonnieren(['kaertchen'], () => spaeterAngemeldet++);
  assert.equal(spaeterAngemeldet, 1);
  assert.equal(sockets.length, 1);
});

test('Wer sich bei noch nicht offener Verbindung anmeldet, wird erst mit dem Öffnen gerufen', () => {
  const { sockets, socketErzeugen } = erstelleFalschenSocket();
  const verbindung = erstelleLiveVerbindung(socketErzeugen);
  let angemeldet = 0;
  verbindung.abonnieren(['kaertchen'], () => angemeldet++);
  assert.equal(angemeldet, 0);
  sockets[0].onopen();
  assert.equal(angemeldet, 1);
});
