export function berechneVerbleibendeSekunden(letzteInteraktionMs, jetztMs, zeitlimitMs) {
  const verbleibendMs = zeitlimitMs - (jetztMs - letzteInteraktionMs);
  return Math.max(0, Math.round(verbleibendMs / 1000));
}

export function formatiereCountdown(sekunden) {
  const minutenTeil = Math.floor(sekunden / 60);
  const sekundenTeil = sekunden % 60;
  return `${minutenTeil}:${String(sekundenTeil).padStart(2, '0')}`;
}

const MELDE_ABSTAND_MS = 60 * 1000;

export function aktivitaetMeldenNoetig(letzteMeldungMs, jetztMs) {
  if (letzteMeldungMs === null) return true;
  return jetztMs - letzteMeldungMs >= MELDE_ABSTAND_MS;
}
