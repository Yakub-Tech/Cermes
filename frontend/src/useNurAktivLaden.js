import { useEffect, useRef } from 'react';

export function useNurAktivLaden(aktiv, laden) {
  const veraltet = useRef(false);
  const aktuellesLaden = useRef(laden);
  aktuellesLaden.current = laden;

  useEffect(() => {
    if (aktiv && veraltet.current) {
      veraltet.current = false;
      aktuellesLaden.current();
    }
  }, [aktiv]);

  return () => {
    if (aktiv) {
      aktuellesLaden.current();
    } else {
      veraltet.current = true;
    }
  };
}
