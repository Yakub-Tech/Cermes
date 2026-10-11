const SCHLUESSEL = 'sprache';

export function spracheLesen(holeSpeicher) {
  try {
    return holeSpeicher().getItem(SCHLUESSEL) === 'tr' ? 'tr' : 'de';
  } catch {
    return 'de';
  }
}

export function spracheSpeichern(holeSpeicher, sprache) {
  try {
    holeSpeicher().setItem(SCHLUESSEL, sprache);
  } catch {
  }
}
