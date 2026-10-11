import { useEffect, useRef, useState } from 'react';

export function useUeberlaufErkennung(abhaengigkeit) {
  const rahmen = useRef(null);
  const inhalt = useRef(null);
  const [ueberlaufPx, setUeberlaufPx] = useState(0);

  useEffect(() => {
    if (!rahmen.current || !inhalt.current) return;

    function neuMessen() {
      const differenzPx = inhalt.current.scrollHeight - rahmen.current.clientHeight;
      setUeberlaufPx(Math.max(0, differenzPx));
    }

    neuMessen();
    const beobachter = new ResizeObserver(neuMessen);
    beobachter.observe(rahmen.current);
    return () => beobachter.disconnect();
  }, [abhaengigkeit]);

  return { rahmen, inhalt, ueberlauf: ueberlaufPx > 0, ueberlaufPx };
}
