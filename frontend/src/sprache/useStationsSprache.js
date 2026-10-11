import { useEffect, useState } from 'react';

import { spracheLesen, spracheSpeichern } from './stationsSpracheSpeicher.js';

const SCHLUESSEL = 'sprache';

function gespeicherteSprache() {
  return spracheLesen(() => localStorage);
}

export function useStationsSprache() {
  const [sprache, setSpracheState] = useState(gespeicherteSprache);

  useEffect(() => {
    function beiSpeicherAenderung(ereignis) {
      if (ereignis.key === SCHLUESSEL) setSpracheState(gespeicherteSprache());
    }
    window.addEventListener('storage', beiSpeicherAenderung);
    return () => window.removeEventListener('storage', beiSpeicherAenderung);
  }, []);

  function setSprache(neueSprache) {
    spracheSpeichern(() => localStorage, neueSprache);
    setSpracheState(neueSprache);
  }

  return [sprache, setSprache];
}
