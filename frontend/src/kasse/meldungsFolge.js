const WIEDERHOLUNG_NACH_MS = [3000, 10000, 30000];

export function erzeugeMeldungsFolge(senden) {
  let laeuft = false;
  let wartend = null;
  let letzterStand = null;
  let hatLetztenStand = false;
  let wiederholungsTimer = null;
  let wiederholungen = 0;
  let beendet = false;

  function absenden(stand) {
    if (beendet) return;
    laeuft = true;
    let fehlgeschlagen = false;
    senden(stand).catch(() => {
      fehlgeschlagen = true;
    }).then(() => {
      if (beendet) return;
      laeuft = false;
      if (wartend !== null) {
        const naechster = wartend;
        wartend = null;
        absenden(naechster);
        return;
      }
      if (fehlgeschlagen && wiederholungen < WIEDERHOLUNG_NACH_MS.length) {
        wiederholungsTimer = setTimeout(() => {
          wiederholungsTimer = null;
          absenden(letzterStand);
        }, WIEDERHOLUNG_NACH_MS[wiederholungen]);
        wiederholungen += 1;
      }
    });
  }

  function melden(stand) {
    letzterStand = stand;
    hatLetztenStand = true;
    clearTimeout(wiederholungsTimer);
    wiederholungsTimer = null;
    wiederholungen = 0;
    if (laeuft) {
      wartend = stand;
      return;
    }
    absenden(stand);
  }

  function erneutMelden() {
    if (hatLetztenStand) melden(letzterStand);
  }

  function beenden() {
    beendet = true;
    clearTimeout(wiederholungsTimer);
    wiederholungsTimer = null;
    wartend = null;
  }

  return { melden, erneutMelden, beenden };
}
