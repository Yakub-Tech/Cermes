import { jetztIso } from './zeit.js';
import { protokolliere, unterschiede } from './audit.js';

export function versucheStatusWechsel(db, benutzer, kaertchen, neuerStatus, erlaubteWechsel) {
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
  const wechsel = db.transaction(() => {
    const ergebnis = db.prepare(
      `UPDATE kaertchen SET status = ?${setzeZeit} WHERE id = ? AND status = ?`
    ).run(...werte);
    if (ergebnis.changes === 0) return false;
    protokolliere(db, benutzer, 'ausgabe', 'kaertchen_status_geaendert', {
      werte: { nummer: kaertchen.nummer, artikel: kaertchen.artikel_name },
      aenderungen: unterschiede(kaertchen, { status: neuerStatus }, ['status']),
    });
    return true;
  });
  return wechsel();
}
