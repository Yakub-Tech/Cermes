import { useEffect, useRef } from 'react';
import { erstelleLiveVerbindung } from './liveVerbindung.js';

export const liveVerbindung = erstelleLiveVerbindung(() => {
  const protokoll = location.protocol === 'https:' ? 'wss' : 'ws';
  return new WebSocket(`${protokoll}://${location.host}/ws`);
});

export function useLiveUpdate(typen, callback) {
  const aktuellerCallback = useRef(callback);
  aktuellerCallback.current = callback;

  useEffect(() => {
    return liveVerbindung.abonnieren(typen, () => aktuellerCallback.current());
  }, [typen.join(',')]);
}
