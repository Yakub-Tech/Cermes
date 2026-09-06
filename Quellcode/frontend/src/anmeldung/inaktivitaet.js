export function berechneVerbleibendeSekunden(letzteInteraktionMs, jetztMs, zeitlimitMs) {
  const verbleibendMs = zeitlimitMs - (jetztMs - letzteInteraktionMs);
  return Math.max(0, Math.round(verbleibendMs / 1000));
}

export function formatiereCountdown(sekunden) {
  const minutenTeil = Math.floor(sekunden / 60);
  const sekundenTeil = sekunden % 60;
  return `${minutenTeil}:${String(sekundenTeil).padStart(2, '0')}`;
}
