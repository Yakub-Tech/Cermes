import express from 'express';
import { oeffneDatenbank } from './db.js';

export function erstelleApp() {
  oeffneDatenbank();
  const app = express();
  app.use(express.json());
  app.get('/api/gesundheit', (_anfrage, antwort) => antwort.json({ ok: true }));
  return app;
}

export function starteServer() {
  const app = erstelleApp();
  const server = app.listen(8080, () => {
    console.log('Cermes läuft auf Port 8080');
  });
  return server;
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  starteServer();
}
