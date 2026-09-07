import { heutigesDatum } from './zeit.js';

export function kaertchenFuerAusgabe(db, status, sortierung = 'id') {
  const zeilen = db.prepare(
    `SELECT id, nummer, artikel_name, artikel_farbe, beilagen, erstellt_am, abholbereit_am, abgeholt_am
     FROM kaertchen
     WHERE status = ? AND substr(erstellt_am, 1, 10) = ?
     ORDER BY ${sortierung}`
  ).all(status, heutigesDatum());
  return zeilen.map((zeile) => ({ ...zeile, beilagen: JSON.parse(zeile.beilagen) }));
}

export function nachArtikelUndNummerAufsteigend(a, b) {
  return a.artikel_name.localeCompare(b.artikel_name, 'de') || a.nummer - b.nummer;
}

export function nachArtikelUndNummerAbsteigend(a, b) {
  return a.artikel_name.localeCompare(b.artikel_name, 'de') || b.nummer - a.nummer;
}
