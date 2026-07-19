import express from 'express';
import { oeffneDatenbank } from './db.js';
import { authEinbinden } from './auth.js';
import { websocketEinbinden } from './broadcast.js';
import tvRouter from './routen/tv.js';
import werbungRouter, { werbeOrdner } from './routen/werbung.js';
import einstellungenRouter from './routen/einstellungen.js';
import statistikRouter from './routen/statistik.js';
import benutzerRouter from './routen/benutzer.js';
import backupRouter from './routen/backup.js';
import artikelRouter from './routen/artikel.js';
import beilagenRouter from './routen/beilagen.js';
import kasseRouter from './routen/kasse.js';
import ausgabeRouter from './routen/ausgabe.js';

export function erstelleApp() {
  oeffneDatenbank();
  const app = express();
  app.use(express.json());
  authEinbinden(app);
  app.get('/api/gesundheit', (_anfrage, antwort) => antwort.json({ ok: true }));
  app.use(artikelRouter);
  app.use(beilagenRouter);
  app.use(kasseRouter);
  app.use(ausgabeRouter);
  app.use(tvRouter);
  app.use(werbungRouter);
  app.use(einstellungenRouter);
  app.use(statistikRouter);
  app.use(benutzerRouter);
  app.use(backupRouter);
  app.use('/werbung', express.static(werbeOrdner()));
  return app;
}

export function starteServer() {
  const app = erstelleApp();
  const server = app.listen(8080, () => {
    console.log('Cermes läuft auf Port 8080');
  });
  websocketEinbinden(server);
  return server;
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  starteServer();
}
