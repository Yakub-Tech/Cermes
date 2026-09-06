import { useEffect, useState } from 'react';

export function useVerbindungsStatus() {
  const [verbunden, setVerbunden] = useState(false);

  useEffect(() => {
    let socket = null;
    let wiederholung = null;
    let beendet = false;

    function verbinden() {
      const protokoll = location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protokoll}://${location.host}/ws`);
      socket.onopen = () => setVerbunden(true);
      socket.onclose = () => {
        setVerbunden(false);
        if (!beendet) wiederholung = setTimeout(verbinden, 2000);
      };
    }
    verbinden();
    return () => {
      beendet = true;
      clearTimeout(wiederholung);
      socket?.close();
    };
  }, []);

  return verbunden;
}
