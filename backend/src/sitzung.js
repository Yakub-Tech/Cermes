import crypto from 'node:crypto';
import { oeffneDatenbank } from './db.js';

export const SITZUNG_DAUER_MS = 24 * 60 * 60 * 1000;

const TOLERANZ_MS = 2 * 60 * 1000;
const RUECKFALL_MINUTEN = 30;

const LESENDE_METHODEN = ['GET', 'HEAD', 'OPTIONS'];

function inaktivitaetsFristMs(db) {
  const zeile = db.prepare("SELECT wert FROM einstellung WHERE schluessel = 'inaktivitaets_abmeldung_minuten'").get();
  let minuten = Number(zeile?.wert);
  if (!Number.isInteger(minuten) || minuten < 1) {
    minuten = RUECKFALL_MINUTEN;
  }
  return minuten * 60 * 1000 + TOLERANZ_MS;
}

export function sitzungAnlegen(db, anfrage, benutzerId) {
  const jetzt = Date.now();
  db.prepare('DELETE FROM sitzung WHERE ausgestellt_ms < ? OR letzte_aktivitaet_ms < ?')
    .run(jetzt - SITZUNG_DAUER_MS, jetzt - inaktivitaetsFristMs(db));
  const kennung = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sitzung (id, benutzer_id, ausgestellt_ms, letzte_aktivitaet_ms) VALUES (?, ?, ?, ?)')
    .run(kennung, benutzerId, jetzt, jetzt);
  anfrage.session.sitzungId = kennung;
}

export function sitzungenDesKontosBeenden(db, benutzerId) {
  db.prepare('DELETE FROM sitzung WHERE benutzer_id = ?').run(benutzerId);
}

export function aktuellerBenutzer(anfrage) {
  const sitzungId = anfrage.session?.sitzungId;
  if (!sitzungId) return null;
  const db = oeffneDatenbank();
  const sitzung = db.prepare('SELECT * FROM sitzung WHERE id = ?').get(sitzungId);
  if (!sitzung) return null;

  const jetzt = Date.now();
  const zuAlt = sitzung.ausgestellt_ms <= jetzt - SITZUNG_DAUER_MS;
  const zuLangeInaktiv = sitzung.letzte_aktivitaet_ms <= jetzt - inaktivitaetsFristMs(db);
  if (zuAlt || zuLangeInaktiv) {
    db.prepare('DELETE FROM sitzung WHERE id = ?').run(sitzungId);
    if (zuLangeInaktiv && !zuAlt) {
      anfrage.inaktivAbgemeldet = true;
    }
    return null;
  }

  if (!LESENDE_METHODEN.includes(anfrage.method)) {
    db.prepare('UPDATE sitzung SET letzte_aktivitaet_ms = ? WHERE id = ?').run(jetzt, sitzungId);
  }
  return db.prepare('SELECT * FROM benutzer WHERE id = ?').get(sitzung.benutzer_id) || null;
}
