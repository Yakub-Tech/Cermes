import { useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { berechneVerbleibendeSekunden, aktivitaetMeldenNoetig } from './inaktivitaet.js';
import { inaktivHinweisMerken } from './inaktivHinweisSpeicher.js';

const INTERAKTIONS_EREIGNISSE = ['click', 'keydown', 'touchstart'];

export function useInaktivitaetsAbmeldung(aktiv) {
  const [minuten, setMinuten] = useState(30);
  const [verbleibendeSekunden, setVerbleibendeSekunden] = useState(30 * 60);
  const letzteInteraktion = useRef(Date.now());
  const wirdAbgemeldet = useRef(false);
  const letzteMeldung = useRef(null);

  useLiveUpdate(['einstellungen'], () => {
    if (!aktiv) return;
    apiGet('/api/einstellungen')
      .then((e) => setMinuten(e.inaktivitaets_abmeldung_minuten))
      .catch(() => {});
  });

  useEffect(() => {
    if (!aktiv) return;

    function aktivitaetMelden() {
      if (!aktivitaetMeldenNoetig(letzteMeldung.current, Date.now())) return;
      letzteMeldung.current = Date.now();
      apiPost('/api/aktivitaet').catch((fehler) => {
        if (fehler.status !== 401 || wirdAbgemeldet.current) return;
        wirdAbgemeldet.current = true;
        if (fehler.daten?.inaktiv) inaktivHinweisMerken(() => sessionStorage, minuten);
        location.reload();
      });
    }

    function interaktion() {
      letzteInteraktion.current = Date.now();
      aktivitaetMelden();
    }

    if (letzteMeldung.current === null) aktivitaetMelden();
    INTERAKTIONS_EREIGNISSE.forEach((typ) => document.addEventListener(typ, interaktion));

    const zeitlimitMs = minuten * 60 * 1000;
    const intervall = setInterval(() => {
      const sekunden = berechneVerbleibendeSekunden(letzteInteraktion.current, Date.now(), zeitlimitMs);
      setVerbleibendeSekunden(sekunden);
      if (sekunden === 0 && !wirdAbgemeldet.current) {
        wirdAbgemeldet.current = true;
        inaktivHinweisMerken(() => sessionStorage, minuten);
        apiPost('/api/logout', { grund: 'inaktivitaet' }).catch(() => {}).finally(() => location.reload());
      }
    }, 1000);

    return () => {
      INTERAKTIONS_EREIGNISSE.forEach((typ) => document.removeEventListener(typ, interaktion));
      clearInterval(intervall);
    };
  }, [aktiv, minuten]);

  return { verbleibendeSekunden };
}
