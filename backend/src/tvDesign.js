export function istTvDesign(wert) {
  return wert === 'dunkel' || wert === 'hell';
}

export function gueltigesTvDesign(wert) {
  return wert === 'hell' ? 'hell' : 'dunkel';
}
