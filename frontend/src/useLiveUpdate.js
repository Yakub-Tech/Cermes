import { useEffect, useRef } from 'react';

export function useLiveUpdate(typen, callback) {
  const aktuellerCallback = useRef(callback);
  aktuellerCallback.current = callback;

  useEffect(() => {
    let socket = null;
    let wiederholung = null;
    let beendet = false;

    function verbinden() {
      const protokoll = location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protokoll}://${location.host}/ws`);
      socket.onopen = () => aktuellerCallback.current();
      socket.onmessage = (nachricht) => {
        const { typ } = JSON.parse(nachricht.data);
        if (typen.includes(typ)) aktuellerCallback.current();
      };
      socket.onclose = () => {
        if (!beendet) wiederholung = setTimeout(verbinden, 2000);
      };
    }
    verbinden();
    return () => {
      beendet = true;
      clearTimeout(wiederholung);
      socket?.close();
    };
  }, [typen.join(',')]);
}
