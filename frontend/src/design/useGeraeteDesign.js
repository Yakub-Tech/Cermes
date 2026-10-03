import { useEffect, useState } from 'react';
import { DESIGN_SCHLUESSEL, designLesen, designSpeichern, gueltigesDesign } from './designSpeicher.js';
import { designAnwenden } from './designAnwenden.js';

function gespeichertesDesign() {
  return designLesen(() => localStorage);
}

export function useGeraeteDesign() {
  const [design, setDesignState] = useState(gespeichertesDesign);

  useEffect(() => {
    designAnwenden(design);
  }, [design]);

  useEffect(() => {
    function beiSpeicherAenderung(ereignis) {
      if (ereignis.key === DESIGN_SCHLUESSEL) setDesignState(gespeichertesDesign());
    }
    window.addEventListener('storage', beiSpeicherAenderung);
    return () => window.removeEventListener('storage', beiSpeicherAenderung);
  }, []);

  function setDesign(neuesDesign) {
    designSpeichern(() => localStorage, neuesDesign);
    setDesignState(gueltigesDesign(neuesDesign));
  }

  return [design, setDesign];
}
