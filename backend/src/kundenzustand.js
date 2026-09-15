let zustand = { warenkorb: [], fokus: null, summe_cent: null, sprache: 'de' };

export function kundenzustandLesen() {
  return zustand;
}

function gueltigeSummeCent(wert) {
  return typeof wert === 'number' && Number.isFinite(wert) && wert >= 0 ? wert : null;
}

function gueltigeSprache(wert) {
  return wert === 'de' || wert === 'tr' ? wert : 'de';
}

export function kundenzustandSchreiben(neuerZustand) {
  zustand = {
    warenkorb: Array.isArray(neuerZustand?.warenkorb) ? neuerZustand.warenkorb : [],
    fokus: neuerZustand?.fokus ?? null,
    summe_cent: gueltigeSummeCent(neuerZustand?.summe_cent),
    sprache: gueltigeSprache(neuerZustand?.sprache),
  };
}
