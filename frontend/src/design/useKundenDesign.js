import { useState } from 'react';
import { KUNDENDESIGN_SCHLUESSEL, designLesen, designSpeichern, gueltigesDesign } from './designSpeicher.js';

export function useKundenDesign() {
  const [design, setDesignState] = useState(() => designLesen(() => localStorage, KUNDENDESIGN_SCHLUESSEL));

  function setDesign(neuesDesign) {
    designSpeichern(() => localStorage, neuesDesign, KUNDENDESIGN_SCHLUESSEL);
    setDesignState(gueltigesDesign(neuesDesign));
  }

  return [design, setDesign];
}
