import { useEffect, useRef, useState } from 'react';
import { findeNeueSchluessel, kaertchenSchluessel } from './neueKaertchen.js';

const HERVORHEBEN_MS = 5000;

export function useNeueKaertchen(kaertchen, geladen) {
  const [hervorgehoben, setHervorgehoben] = useState(new Set());
  const letzteListe = useRef(null);
  const timer = useRef([]);

  useEffect(() => {
    if (!geladen) return;
    const neu = findeNeueSchluessel(letzteListe.current, kaertchen);
    letzteListe.current = kaertchen;
    if (neu.length === 0) return;

    setHervorgehoben((alt) => new Set([...alt, ...neu]));
    const id = setTimeout(() => {
      setHervorgehoben((alt) => {
        const rest = new Set(alt);
        neu.forEach((schluessel) => rest.delete(schluessel));
        return rest;
      });
    }, HERVORHEBEN_MS);
    timer.current.push(id);
  }, [kaertchen, geladen]);

  useEffect(() => () => timer.current.forEach(clearTimeout), []);

  return (kaertchen_) => hervorgehoben.has(kaertchenSchluessel(kaertchen_));
}
