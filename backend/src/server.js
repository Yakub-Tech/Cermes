import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { oeffneDatenbank } from './db.js';
import { authEinbinden } from './auth.js';
import { websocketEinbinden } from './broadcast.js';
import tvRouter from './routen/tv.js';
import werbungRouter, { werbeOrdner } from './routen/werbung.js';
import logoRouter, { logoOrdner } from './routen/logo.js';
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
  app.get('/api/netzwerkadresse', (_anfrage, antwort) => {
    const ip = process.env.CERMES_HOST_IP;
    antwort.json({ adresse: ip ? `${ip}:8080` : null });
  });
  app.use(artikelRouter);
  app.use(beilagenRouter);
  app.use(kasseRouter);
  app.use(ausgabeRouter);
  app.use(tvRouter);
  app.use(werbungRouter);
  app.use(logoRouter);
  app.use(einstellungenRouter);
  app.use(statistikRouter);
  app.use(benutzerRouter);
  app.use(backupRouter);
  app.use('/werbung', express.static(werbeOrdner()));
  app.use('/logo', express.static(logoOrdner()));
  frontendAusliefern(app);
  return app;
}

function frontendAusliefern(app) {
  const distOrdner = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'dist'
  );
  if (!fs.existsSync(distOrdner)) return;
  app.use(express.static(distOrdner));
  app.get('*', (anfrage, antwort, weiter) => {
    if (anfrage.path.startsWith('/api/') || anfrage.path.startsWith('/werbung/') || anfrage.path.startsWith('/logo/')) {
      return weiter();
    }
    antwort.sendFile(path.join(distOrdner, 'index.html'));
  });
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
