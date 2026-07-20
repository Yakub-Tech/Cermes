import { useEffect, useRef, useState } from 'react';

export function useUeberlaufErkennung(abhaengigkeit) {
  const rahmen = useRef(null);
  const inhalt = useRef(null);
  const [ueberlauf, setUeberlauf] = useState(false);

  useEffect(() => {
    if (rahmen.current && inhalt.current) {
      setUeberlauf(inhalt.current.scrollHeight > rahmen.current.clientHeight);
    }
  }, [abhaengigkeit]);

  return { rahmen, inhalt, ueberlauf };
}
