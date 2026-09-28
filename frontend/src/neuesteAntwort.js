import { useRef } from 'react';

export function erzeugeNeuesteAntwort() {
  const zaehler = {};
  return function neueste(schluessel, abruf, uebernehmen) {
    zaehler[schluessel] = (zaehler[schluessel] ?? 0) + 1;
    const eigeneNummer = zaehler[schluessel];
    return abruf.then((daten) => {
      if (eigeneNummer === zaehler[schluessel]) uebernehmen(daten);
    });
  };
}

export function useNeuesteAntwort() {
  const merker = useRef(null);
  if (merker.current === null) merker.current = erzeugeNeuesteAntwort();
  return merker.current;
}
