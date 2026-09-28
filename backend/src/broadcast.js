import { WebSocketServer } from 'ws';

let wss = null;

export function websocketEinbinden(server, herzschlagMs = 15000) {
  const dieserServer = new WebSocketServer({ server, path: '/ws' });
  wss = dieserServer;
  dieserServer.on('connection', (client) => {
    client.lebt = true;
    client.on('pong', () => { client.lebt = true; });
    client.on('error', () => client.terminate());
  });

  const herzschlag = setInterval(() => {
    for (const client of dieserServer.clients) {
      if (client.lebt === false) {
        client.terminate();
        continue;
      }
      client.lebt = false;
      client.ping();
      client.send(JSON.stringify({ typ: 'herzschlag' }), () => {});
    }
  }, herzschlagMs);
  herzschlag.unref();
  dieserServer.on('close', () => clearInterval(herzschlag));
}

export function sendeEreignis(typ) {
  if (!wss) return;
  const nachricht = JSON.stringify({ typ });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(nachricht, () => {});
  }
}
