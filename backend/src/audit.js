import { jetztIso } from './zeit.js';

export const BEREICHE = [
  'kasse', 'storno', 'ausgabe', 'artikel', 'benutzer', 'anmeldung', 'einstellungen', 'bilder', 'backup',
];

export function protokolliere(db, benutzer, bereich, aktion, details = {}) {
  db.prepare(
    `INSERT INTO audit_eintrag (zeitpunkt, benutzername, rolle, bereich, aktion, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(jetztIso(), benutzer.benutzername, benutzer.rolle ?? null, bereich, aktion, JSON.stringify(details));
}

export function unterschiede(vorher, nachher, felder) {
  const ergebnis = {};
  for (const feld of felder) {
    const alt = vorher[feld] ?? null;
    const neu = nachher[feld] ?? null;
    if (JSON.stringify(alt) !== JSON.stringify(neu)) {
      ergebnis[feld] = { vorher: alt, nachher: neu };
    }
  }
  return ergebnis;
}

export function aktionFuerAenderung(basis, aenderungen) {
  const felder = Object.keys(aenderungen);
  if (felder.length === 1 && felder[0] === 'aktiv') {
    return `${basis}_${aenderungen.aktiv.nachher ? 'aktiviert' : 'deaktiviert'}`;
  }
  return `${basis}_geaendert`;
}

export function protokolliereAenderung(db, benutzer, bereich, basis, werte, aenderungen) {
  if (Object.keys(aenderungen).length === 0) return;
  protokolliere(db, benutzer, bereich, aktionFuerAenderung(basis, aenderungen), { werte, aenderungen });
}
