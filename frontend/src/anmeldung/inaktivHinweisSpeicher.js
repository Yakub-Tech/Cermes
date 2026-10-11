const SCHLUESSEL = 'cermes-inaktiv-abgemeldet';

export function inaktivHinweisMerken(holeSpeicher, minuten) {
  try {
    holeSpeicher().setItem(SCHLUESSEL, JSON.stringify({ minuten }));
  } catch {
  }
}

export function inaktivHinweisAbholen(holeSpeicher) {
  try {
    const speicher = holeSpeicher();
    const eintrag = speicher.getItem(SCHLUESSEL);
    if (eintrag === null) return null;
    speicher.removeItem(SCHLUESSEL);
    const minuten = JSON.parse(eintrag).minuten;
    if (typeof minuten !== 'number') return null;
    return minuten;
  } catch {
    return null;
  }
}
