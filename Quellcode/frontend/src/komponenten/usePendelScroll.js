import { useEffect, useState } from 'react';
import { berechnePendelPhase, PENDEL_GESCHWINDIGKEIT_PX_PRO_SEKUNDE } from './pendelPhase.js';

export function usePendelScroll(ueberlaufPx) {
  const [versatzPx, setVersatzPx] = useState(0);

  useEffect(() => {
    const bevorzugtWenigerBewegung =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (ueberlaufPx <= 0 || bevorzugtWenigerBewegung) {
      setVersatzPx(0);
      return;
    }

    let zeitplan;
    function aktualisieren() {
      const { zielVersatzPx, sekundenBisNaechsterWechsel } = berechnePendelPhase(
        Date.now() / 1000,
        ueberlaufPx
      );
      setVersatzPx(zielVersatzPx);
      zeitplan = setTimeout(aktualisieren, sekundenBisNaechsterWechsel * 1000);
    }
    aktualisieren();

    return () => clearTimeout(zeitplan);
  }, [ueberlaufPx]);

  return {
    versatzPx,
    uebergangSekunden: ueberlaufPx / PENDEL_GESCHWINDIGKEIT_PX_PRO_SEKUNDE,
  };
}
