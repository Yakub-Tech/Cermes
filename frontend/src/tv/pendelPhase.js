export const PENDEL_GESCHWINDIGKEIT_PX_PRO_SEKUNDE = 40;
export const PENDEL_PAUSE_SEKUNDEN = 4;

export function berechnePendelPhase(zeitSekunden, ueberlaufPx) {
  if (ueberlaufPx <= 0) {
    return { zielVersatzPx: 0, sekundenBisNaechsterWechsel: null };
  }

  const fahrtSekunden = ueberlaufPx / PENDEL_GESCHWINDIGKEIT_PX_PRO_SEKUNDE;
  const zyklusSekunden = 2 * fahrtSekunden + 2 * PENDEL_PAUSE_SEKUNDEN;
  const phase = zeitSekunden % zyklusSekunden;

  const pauseObenEnde = PENDEL_PAUSE_SEKUNDEN;
  const fahrtNachUntenEnde = pauseObenEnde + fahrtSekunden;
  const pauseUntenEnde = fahrtNachUntenEnde + PENDEL_PAUSE_SEKUNDEN;

  if (phase < pauseObenEnde) {
    return { zielVersatzPx: 0, sekundenBisNaechsterWechsel: pauseObenEnde - phase };
  }
  if (phase < fahrtNachUntenEnde) {
    return { zielVersatzPx: ueberlaufPx, sekundenBisNaechsterWechsel: fahrtNachUntenEnde - phase };
  }
  if (phase < pauseUntenEnde) {
    return { zielVersatzPx: ueberlaufPx, sekundenBisNaechsterWechsel: pauseUntenEnde - phase };
  }
  return { zielVersatzPx: 0, sekundenBisNaechsterWechsel: zyklusSekunden - phase };
}
