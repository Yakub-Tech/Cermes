import { jetztIso } from './zeit.js';

export function versucheStatusWechsel(db, kaertchen, neuerStatus, erlaubteWechsel) {
  const erlaubt = erlaubteWechsel.some(
    ([von, nach]) => von === kaertchen.status && nach === neuerStatus
  );
  if (!erlaubt) return false;
  const zeitSpalte = neuerStatus === 'abholbereit' ? 'abholbereit_am'
    : neuerStatus === 'abgeholt' ? 'abgeholt_am' : null;
  const setzeZeit = zeitSpalte ? `, ${zeitSpalte} = ?` : '';
  const werte = zeitSpalte
    ? [neuerStatus, jetztIso(), kaertchen.id, kaertchen.status]
    : [neuerStatus, kaertchen.id, kaertchen.status];
  const ergebnis = db.prepare(
    `UPDATE kaertchen SET status = ?${setzeZeit} WHERE id = ? AND status = ?`
  ).run(...werte);
  return ergebnis.changes > 0;
}
