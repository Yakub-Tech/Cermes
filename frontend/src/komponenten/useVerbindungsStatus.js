import { useEffect, useState } from 'react';
import { liveVerbindung } from '../useLiveUpdate.js';

export function useVerbindungsStatus() {
  const [verbunden, setVerbunden] = useState(liveVerbindung.istVerbunden());

  useEffect(() => {
    setVerbunden(liveVerbindung.istVerbunden());
    return liveVerbindung.statusAbonnieren(setVerbunden);
  }, []);

  return verbunden;
}
