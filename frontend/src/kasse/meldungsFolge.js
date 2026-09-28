export function erzeugeMeldungsFolge(senden) {
  let laeuft = false;
  let wartend = null;
  let letzterStand = null;
  let hatLetztenStand = false;

  function absenden(stand) {
    laeuft = true;
    senden(stand).catch(() => {}).then(() => {
      laeuft = false;
      if (wartend !== null) {
        const naechster = wartend;
        wartend = null;
        absenden(naechster);
      }
    });
  }

  function melden(stand) {
    letzterStand = stand;
    hatLetztenStand = true;
    if (laeuft) {
      wartend = stand;
      return;
    }
    absenden(stand);
  }

  function erneutMelden() {
    if (hatLetztenStand) melden(letzterStand);
  }

  return { melden, erneutMelden };
}
