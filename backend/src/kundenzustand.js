const zustandJeKasse = new Map();

function standardZustand() {
  return { warenkorb: [], fokus: null, summe_cent: null, sprache: 'de', design: 'dunkel' };
}

export function kassenNummerPruefen(wert) {
  if (wert === undefined || wert === null || wert === '') return 1;
  if (typeof wert === 'number' && Number.isInteger(wert) && wert >= 1 && wert <= 9) return wert;
  if (typeof wert === 'string' && /^[1-9]$/.test(wert)) return Number(wert);
  const fehler = new Error('Die Kassennummer ist ungültig. Erlaubt sind die Zahlen 1 bis 9.');
  fehler.status = 400;
  throw fehler;
}

export function kundenzustandLesen(kassenNummer) {
  return zustandJeKasse.get(kassenNummer) ?? standardZustand();
}

function gueltigeSummeCent(wert) {
  return typeof wert === 'number' && Number.isFinite(wert) && wert >= 0 ? wert : null;
}

function gueltigeSprache(wert) {
  return wert === 'de' || wert === 'tr' ? wert : 'de';
}

function gueltigesDesign(wert) {
  return wert === 'hell' ? 'hell' : 'dunkel';
}

export function kundenzustandSchreiben(kassenNummer, neuerZustand) {
  zustandJeKasse.set(kassenNummer, {
    warenkorb: Array.isArray(neuerZustand?.warenkorb) ? neuerZustand.warenkorb : [],
    fokus: neuerZustand?.fokus ?? null,
    summe_cent: gueltigeSummeCent(neuerZustand?.summe_cent),
    sprache: gueltigeSprache(neuerZustand?.sprache),
    design: gueltigesDesign(neuerZustand?.design),
  });
}
