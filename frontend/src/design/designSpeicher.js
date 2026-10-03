export const DESIGN_SCHLUESSEL = 'cermes-design';
export const STANDARD_DESIGN = 'dunkel';

export function gueltigesDesign(wert) {
  return wert === 'hell' ? 'hell' : 'dunkel';
}

export function designLesen(holeSpeicher, schluessel = DESIGN_SCHLUESSEL) {
  try {
    return gueltigesDesign(holeSpeicher().getItem(schluessel));
  } catch {
    return STANDARD_DESIGN;
  }
}

export function designSpeichern(holeSpeicher, design, schluessel = DESIGN_SCHLUESSEL) {
  try {
    holeSpeicher().setItem(schluessel, gueltigesDesign(design));
  } catch {
  }
}
