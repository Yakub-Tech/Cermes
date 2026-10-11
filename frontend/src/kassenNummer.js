const SCHLUESSEL = 'cermes-kassen-nummer';

export function kassenNummerAusText(text) {
  if (typeof text !== 'string') return null;
  if (!/^[1-9]$/.test(text)) return null;
  return Number(text);
}

export function kassenNummerDiesesGeraets(urlWert, holeSpeicher) {
  const ausAdresse = kassenNummerAusText(urlWert);
  if (ausAdresse !== null) {
    try {
      holeSpeicher().setItem(SCHLUESSEL, String(ausAdresse));
    } catch {
    }
    return ausAdresse;
  }

  let gespeichert = null;
  try {
    gespeichert = kassenNummerAusText(holeSpeicher().getItem(SCHLUESSEL));
  } catch {
    gespeichert = null;
  }
  if (gespeichert !== null) return gespeichert;
  return 1;
}
