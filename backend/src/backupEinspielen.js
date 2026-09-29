import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrationenAusfuehren, neuesterMigrationsstand } from './db.js';

export const BILDER_ORDNER = ['werbung', 'logo', 'artikelbilder'];

export const ENTPACK_GRENZEN = { maxBytes: 2 * 1024 * 1024 * 1024, maxDateien: 10000 };

function zuGrossFehler(text) {
  const fehler = new Error(`${text} Das ist kein normales Cermes-Backup, der bisherige Stand ist unverändert.`);
  fehler.status = 400;
  return fehler;
}

export async function entpacken(zip, tempOrdner, grenzen = ENTPACK_GRENZEN) {
  if (zip.files.length > grenzen.maxDateien) {
    throw zuGrossFehler(
      `Dieses Backup enthält zu viele Dateien (mehr als ${grenzen.maxDateien.toLocaleString('de-DE')}).`
    );
  }
  fs.rmSync(tempOrdner, { recursive: true, force: true });
  fs.mkdirSync(tempOrdner, { recursive: true });
  let entpackteBytes = 0;
  for (const eintrag of zip.files) {
    if (eintrag.type !== 'File') continue;
    const teile = eintrag.path.split('/');
    const istDatenbank = eintrag.path === 'cermes.sqlite';
    const istBild = teile.length === 2 && BILDER_ORDNER.includes(teile[0])
      && teile[1] !== '' && teile[1] !== '.' && teile[1] !== '..';
    if (!istDatenbank && !istBild) continue;
    const ziel = path.join(tempOrdner, eintrag.path);
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    const datei = fs.openSync(ziel, 'w');
    try {
      for await (const stueck of eintrag.stream()) {
        entpackteBytes += stueck.length;
        if (entpackteBytes > grenzen.maxBytes) {
          const gigabyte = grenzen.maxBytes / (1024 * 1024 * 1024);
          throw zuGrossFehler(`Dieses Backup ist entpackt zu groß (mehr als ${gigabyte.toLocaleString('de-DE')} GB).`);
        }
        let geschrieben = 0;
        while (geschrieben < stueck.length) {
          geschrieben += fs.writeSync(datei, stueck, geschrieben, stueck.length - geschrieben);
        }
      }
    } finally {
      fs.closeSync(datei);
    }
  }
}

function erwarteteSpalten() {
  const frisch = new Database(':memory:');
  migrationenAusfuehren(frisch);
  const spalten = spaltenListe(frisch);
  frisch.close();
  return spalten;
}

function spaltenListe(datenbank) {
  const liste = [];
  const tabellen = datenbank.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
  for (const tabelle of tabellen) {
    for (const spalte of datenbank.pragma(`table_info(${tabelle.name})`)) {
      liste.push(`${tabelle.name}.${spalte.name}`);
    }
  }
  return liste;
}

export function pruefeDatenbank(datei) {
  let pruefDb;
  try {
    pruefDb = new Database(datei, { fileMustExist: true });
    if (pruefDb.pragma('integrity_check', { simple: true }) !== 'ok') {
      return 'Die Datenbank in diesem Backup ist beschädigt und kann nicht eingespielt werden.';
    }
    const tabellen = pruefDb.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
      .map((zeile) => zeile.name);
    const stand = pruefDb.pragma('user_version', { simple: true });
    if (!['benutzer', 'artikel', 'kaertchen'].every((name) => tabellen.includes(name)) || stand < 1) {
      return 'Diese Datenbank stammt nicht aus Cermes. Das ist kein Cermes-Backup.';
    }
    if (stand > neuesterMigrationsstand()) {
      return 'Dieses Backup stammt aus einer neueren Cermes-Version und kann hier nicht eingespielt werden.';
    }
    migrationenAusfuehren(pruefDb);
    const vorhanden = spaltenListe(pruefDb);
    if (!erwarteteSpalten().every((spalte) => vorhanden.includes(spalte))) {
      return 'Diese Datenbank hat nicht den Aufbau einer Cermes-Datenbank. Das ist kein brauchbares Cermes-Backup.';
    }
    if (pruefDb.pragma('foreign_key_check').length > 0) {
      return 'Die Datenbank in diesem Backup ist in sich widersprüchlich und kann nicht eingespielt werden.';
    }
    return null;
  } catch {
    return 'Die Datenbank in diesem Backup ist keine gültige Datenbankdatei.';
  } finally {
    if (pruefDb) pruefDb.close();
  }
}

export function uebernehmen(tempOrdner, datenOrdner) {
  const namen = ['cermes.sqlite', ...BILDER_ORDNER].filter((name) => fs.existsSync(path.join(tempOrdner, name)));
  const erledigt = [];
  try {
    for (const name of namen) {
      const ziel = path.join(datenOrdner, name);
      const zurSeite = `${ziel}.vor-einspielen`;
      fs.rmSync(zurSeite, { recursive: true, force: true });
      const hatteAlt = fs.existsSync(ziel);
      if (hatteAlt) fs.renameSync(ziel, zurSeite);
      erledigt.push({ ziel, zurSeite, hatteAlt });
      fs.renameSync(path.join(tempOrdner, name), ziel);
    }
  } catch (fehler) {
    for (const { ziel, zurSeite, hatteAlt } of erledigt.reverse()) {
      fs.rmSync(ziel, { recursive: true, force: true });
      if (hatteAlt) fs.renameSync(zurSeite, ziel);
    }
    throw fehler;
  }
  for (const name of BILDER_ORDNER) {
    fs.rmSync(path.join(datenOrdner, `${name}.vor-einspielen`), { recursive: true, force: true });
  }
}
