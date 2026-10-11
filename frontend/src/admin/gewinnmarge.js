export function gewinnmargeBerechnen(gesamt) {
  if (!gesamt.umsatz_cent) return null;
  return Math.round((gesamt.gewinn_cent / gesamt.umsatz_cent) * 100);
}
