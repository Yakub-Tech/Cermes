import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { WebSocket } from 'ws';
import { websocketEinbinden, sendeEreignis } from '../src/broadcast.js';

function starteServer() {
  const server = http.createServer((_anfrage, antwort) => antwort.end('ok'));
  websocketEinbinden(server);
  return new Promise((fertig) => server.listen(0, () => fertig(server)));
}

function sendeUngueltigesFrame(port) {
  return new Promise((fertig) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write(
        'GET /ws HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n'
      );
      socket.once('data', () => socket.write(Buffer.from([0x81, 0x01, 0x41])));
    });
    socket.on('error', () => {});
    socket.on('close', fertig);
    setTimeout(() => { socket.destroy(); fertig(); }, 500);
  });
}

test('Ungültiges WebSocket-Frame beendet den Server nicht, andere Clients bekommen weiter Ereignisse', async () => {
  const abstuerze = [];
  const merken = (fehler) => abstuerze.push(fehler);
  process.on('uncaughtException', merken);
  const server = await starteServer();
  const port = server.address().port;
  try {
    const gesund = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const empfangen = new Promise((fertig) => gesund.on('message', (daten) => fertig(daten.toString())));
    await new Promise((fertig) => gesund.on('open', fertig));

    await sendeUngueltigesFrame(port);
    await new Promise((fertig) => setTimeout(fertig, 100));

    assert.deepEqual(abstuerze, []);
    sendeEreignis('kaertchen');
    const nachEinerSekunde = new Promise((fertig) => setTimeout(() => fertig('keine Nachricht'), 1000));
    assert.equal(await Promise.race([empfangen, nachEinerSekunde]), JSON.stringify({ typ: 'kaertchen' }));
    gesund.close();
  } finally {
    process.off('uncaughtException', merken);
    server.closeAllConnections();
    server.close();
  }
});

test('Server schickt Herzschlag und trennt Verbindungen, die nicht mehr antworten', async () => {
  const server = http.createServer((_anfrage, antwort) => antwort.end('ok'));
  websocketEinbinden(server, 100);
  await new Promise((fertig) => server.listen(0, fertig));
  const port = server.address().port;
  try {
    const gesund = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const herzschlag = new Promise((fertig) => gesund.on('message', (daten) => fertig(daten.toString())));
    const nachEinerSekunde = new Promise((fertig) => setTimeout(() => fertig('kein Herzschlag'), 1000));
    assert.equal(await Promise.race([herzschlag, nachEinerSekunde]), JSON.stringify({ typ: 'herzschlag' }));

    const stumm = net.connect(port, '127.0.0.1', () => {
      stumm.write(
        'GET /ws HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n'
      );
    });
    stumm.on('error', () => {});
    stumm.resume();
    const getrennt = new Promise((fertig) => stumm.on('close', () => fertig('getrennt')));
    const zuSpaet = new Promise((fertig) => setTimeout(() => fertig('noch verbunden'), 1000));
    assert.equal(await Promise.race([getrennt, zuSpaet]), 'getrennt');
    assert.equal(gesund.readyState, 1, 'antwortende Clients bleiben verbunden');
    gesund.close();
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
