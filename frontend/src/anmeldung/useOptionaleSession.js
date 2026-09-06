import { useEffect, useState } from 'react';
import { apiGet } from '../api.js';

export function useOptionaleSession() {
  const [zustand, setZustand] = useState({ laedt: true, benutzername: null });

  useEffect(() => {
    let aktiv = true;
    apiGet('/api/session').then((session) => {
      if (!aktiv) return;
      setZustand({ laedt: false, benutzername: session.angemeldet ? session.benutzername : null });
    }).catch(() => {
      if (aktiv) setZustand({ laedt: false, benutzername: null });
    });
    return () => { aktiv = false; };
  }, []);

  return zustand;
}
