export function erzeugeMeldungsFolge(senden) {
  let laeuft = false;
  let wartend = null;

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

  return function melden(stand) {
    if (laeuft) {
      wartend = stand;
      return;
    }
    absenden(stand);
  };
}
