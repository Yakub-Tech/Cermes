export function inTeileZerlegen(liste, groesse) {
  if (liste.length === 0) return [];
  const anzahlTeile = Math.max(1, Math.ceil(liste.length / groesse));
  const basis = Math.floor(liste.length / anzahlTeile);
  const mitRest = liste.length % anzahlTeile;
  const teile = [];
  let start = 0;
  for (let nummer = 0; nummer < anzahlTeile; nummer++) {
    const laenge = nummer < mitRest ? basis + 1 : basis;
    teile.push(liste.slice(start, start + laenge));
    start += laenge;
  }
  return teile;
}

function langesWortTeilen(wort, maxBreite, messen) {
  const stuecke = [];
  let aktuell = '';
  for (const zeichen of wort) {
    if (aktuell !== '' && messen(aktuell + zeichen) > maxBreite) {
      stuecke.push(aktuell);
      aktuell = '';
    }
    aktuell += zeichen;
  }
  stuecke.push(aktuell);
  return stuecke;
}

function mitAuslassung(text, maxBreite, messen) {
  let gekuerzt = text;
  while (gekuerzt.length > 0 && messen(`${gekuerzt}…`) > maxBreite) {
    gekuerzt = gekuerzt.slice(0, -1).trimEnd();
  }
  return `${gekuerzt}…`;
}

export function textUmbrechen(text, maxBreite, messen, maxZeilen) {
  const zeilen = [];
  let aktuell = '';
  for (const wort of String(text).split(' ')) {
    const stuecke = messen(wort) > maxBreite ? langesWortTeilen(wort, maxBreite, messen) : [wort];
    for (const stueck of stuecke) {
      const probe = aktuell === '' ? stueck : `${aktuell} ${stueck}`;
      if (aktuell === '' || messen(probe) <= maxBreite) {
        aktuell = probe;
      } else {
        zeilen.push(aktuell);
        aktuell = stueck;
      }
    }
  }
  zeilen.push(aktuell);
  if (zeilen.length <= maxZeilen) return zeilen;
  const sichtbar = zeilen.slice(0, maxZeilen);
  sichtbar[maxZeilen - 1] = mitAuslassung(sichtbar[maxZeilen - 1], maxBreite, messen);
  return sichtbar;
}

export function skalaBauen(kleinster, groesster) {
  const unten = Math.min(0, kleinster);
  const oben = Math.max(0, groesster);
  if (oben === 0 && unten === 0) return { min: 0, max: 1, schritte: [0, 1] };

  const rohSchritt = (oben - unten) / 5;
  const zehner = 10 ** Math.floor(Math.log10(rohSchritt));
  let schritt = zehner;
  for (const faktor of [1, 2, 5, 10]) {
    schritt = faktor * zehner;
    if (schritt >= rohSchritt) break;
  }
  schritt = Math.max(1, schritt);

  const min = Math.floor(unten / schritt) * schritt;
  const max = Math.ceil(oben / schritt) * schritt;
  const schritte = [];
  for (let wert = min; wert <= max; wert += schritt) schritte.push(wert);
  return { min, max, schritte };
}
