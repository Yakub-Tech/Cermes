import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../api.js';

export function useSession(erwarteteRolle) {
  const [zustand, setZustand] = useState({ laedt: true, angemeldet: false, rolle: null, benutzername: null });
  const navigiere = useNavigate();

  useEffect(() => {
    let aktiv = true;
    apiGet('/api/session').then((session) => {
      if (!aktiv) return;
      if (!session.angemeldet || session.rolle !== erwarteteRolle) {
        navigiere(`/login/${erwarteteRolle}`, { replace: true });
        return;
      }
      setZustand({ laedt: false, angemeldet: true, rolle: session.rolle, benutzername: session.benutzername });
    }).catch(() => {
      if (aktiv) navigiere(`/login/${erwarteteRolle}`, { replace: true });
    });
    return () => { aktiv = false; };
  }, [erwarteteRolle]);

  return zustand;
}
