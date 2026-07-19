export function lesbareSchriftfarbe(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const helligkeit = (r * 299 + g * 587 + b * 114) / 1000;
  return helligkeit > 140 ? '#111111' : '#ffffff';
}
