import { BEREICHE } from './audit.js';

export const EINTRAEGE_PRO_SEITE = 25;

function eingabeFehler(text) {
  const fehler = new Error(text);
  fehler.status = 400;
  return fehler;
}

function pruefeDatum(wert) {
  if (wert && !/^\d{4}-\d{2}-\d{2}$/.test(wert)) {
    throw eingabeFehler('Bitte ein gültiges Datum im Format Jahr-Monat-Tag angeben, zum Beispiel 2026-09-22.');
  }
}

export function leseAuditSeite(db, { bereich, von, bis, benutzer, seite } = {}) {
  if (bereich && !BEREICHE.includes(bereich)) {
    throw eingabeFehler('Diesen Audit-Bereich gibt es nicht.');
  }
  pruefeDatum(von);
  pruefeDatum(bis);
  const seitenNummer = seite === undefined || seite === '' ? 1 : Number(seite);
  if (!Number.isInteger(seitenNummer) || seitenNummer < 1) {
    throw eingabeFehler('Die Seitenzahl muss eine ganze Zahl ab 1 sein.');
  }

  const bedingungen = [];
  const werte = [];
  if (bereich) {
    bedingungen.push('bereich = ?');
    werte.push(bereich);
  }
  if (von) {
    bedingungen.push('substr(zeitpunkt, 1, 10) >= ?');
    werte.push(von);
  }
  if (bis) {
    bedingungen.push('substr(zeitpunkt, 1, 10) <= ?');
    werte.push(bis);
  }
  if (benutzer) {
    bedingungen.push('benutzername = ?');
    werte.push(benutzer);
  }
  const wo = bedingungen.length > 0 ? `WHERE ${bedingungen.join(' AND ')}` : '';

  const gesamt = db.prepare(`SELECT COUNT(*) AS n FROM audit_eintrag ${wo}`).get(...werte).n;
  const zeilen = db.prepare(
    `SELECT id, zeitpunkt, benutzername, rolle, bereich, aktion, details
     FROM audit_eintrag ${wo} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).all(...werte, EINTRAEGE_PRO_SEITE, (seitenNummer - 1) * EINTRAEGE_PRO_SEITE);

  return {
    eintraege: zeilen.map((zeile) => ({ ...zeile, details: JSON.parse(zeile.details) })),
    gesamt,
    seite: seitenNummer,
    seiten: Math.max(1, Math.ceil(gesamt / EINTRAEGE_PRO_SEITE)),
  };
}

export function leseBenutzerListe(db) {
  return db.prepare('SELECT DISTINCT benutzername FROM audit_eintrag ORDER BY benutzername COLLATE NOCASE')
    .all().map((zeile) => zeile.benutzername);
}
