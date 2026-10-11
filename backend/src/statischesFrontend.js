import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import express from 'express';

const KOMPRIMIERBARE_ENDUNGEN = ['.js', '.css'];

export function vorkomprimiereAssets(ordner) {
  if (!fs.existsSync(ordner)) return;
  for (const datei of fs.readdirSync(ordner)) {
    if (datei.endsWith('.gz')) continue;
    if (!KOMPRIMIERBARE_ENDUNGEN.some((endung) => datei.endsWith(endung))) continue;
    const pfad = path.join(ordner, datei);
    const gzipPfad = `${pfad}.gz`;
    if (fs.existsSync(gzipPfad)) continue;
    fs.writeFileSync(gzipPfad, zlib.gzipSync(fs.readFileSync(pfad)));
  }
}

function contentTypeFuer(dateiname) {
  return dateiname.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8';
}

export function gzipAssets(ordner) {
  return (anfrage, antwort, weiter) => {
    const akzeptiertGzip = anfrage.acceptsEncodings('gzip') === 'gzip';
    const gzipPfad = path.join(ordner, `${path.basename(anfrage.path)}.gz`);
    if (!akzeptiertGzip || !fs.existsSync(gzipPfad)) return weiter();
    antwort.set('Content-Encoding', 'gzip');
    antwort.set('Vary', 'Accept-Encoding');
    antwort.type(contentTypeFuer(anfrage.path));
    antwort.sendFile(gzipPfad, { maxAge: '1y', immutable: true });
  };
}

export function frontendEinbinden(app, distOrdner) {
  if (!fs.existsSync(distOrdner)) return false;
  const assetsOrdner = path.join(distOrdner, 'assets');
  vorkomprimiereAssets(assetsOrdner);
  app.use('/assets', gzipAssets(assetsOrdner), express.static(assetsOrdner, { maxAge: '1y', immutable: true }));
  app.use(express.static(distOrdner));
  return true;
}
