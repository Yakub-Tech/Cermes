import { WebSocketServer } from 'ws';

let wss = null;

export function websocketEinbinden(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
}

export function sendeEreignis(typ) {
  if (!wss) return;
  const nachricht = JSON.stringify({ typ });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(nachricht);
  }
}
