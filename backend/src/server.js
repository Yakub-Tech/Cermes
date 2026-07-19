import express from 'express';
import { oeffneDatenbank } from './db.js';
import { authEinbinden } from './auth.js';
import artikelRouter from './routen/artikel.js';
import beilagenRouter from './routen/beilagen.js';
import kasseRouter from './routen/kasse.js';

export function erstelleApp() {
  oeffneDatenbank();
  const app = express();
  app.use(express.json());
  authEinbinden(app);
  app.get('/api/gesundheit', (_anfrage, antwort) => antwort.json({ ok: true }));
  app.use(artikelRouter);
  app.use(beilagenRouter);
  app.use(kasseRouter);
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
