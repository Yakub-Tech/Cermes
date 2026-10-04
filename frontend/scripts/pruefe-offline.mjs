import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { externeAdressenFinden } from './externeAdressen.js';

const dist = new URL('../dist/', import.meta.url).pathname;
const assets = join(dist, 'assets');
const fehler = [];

if (!existsSync(dist)) {
  console.error('Kein Build gefunden. Zuerst "npm run build" ausführen.');
  process.exit(1);
}

const dateien = [join(dist, 'index.html')];
for (const name of readdirSync(assets)) {
  if (name.endsWith('.css')) dateien.push(join(assets, name));
}

for (const datei of dateien) {
  for (const adresse of externeAdressenFinden(readFileSync(datei, 'utf8'))) {
    fehler.push(`${datei.replace(dist, '')}: externe Adresse ${adresse}`);
  }
}

if (!readdirSync(assets).some((name) => name.endsWith('.woff2'))) {
  fehler.push('Keine Schriftdatei (.woff2) im Build, die Schrift würde online geladen.');
}

if (fehler.length > 0) {
  console.error('Offline-Prüfung fehlgeschlagen:\n' + fehler.join('\n'));
  process.exit(1);
}
console.log(`Offline-Prüfung bestanden (${dateien.length} Dateien geprüft).`);
