import { useEffect, useState } from 'react';

const SCHLUESSEL = 'sprache';

function gespeicherteSprache() {
  return localStorage.getItem(SCHLUESSEL) === 'tr' ? 'tr' : 'de';
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
    localStorage.setItem(SCHLUESSEL, neueSprache);
    setSpracheState(neueSprache);
  }

  return [sprache, setSprache];
}
