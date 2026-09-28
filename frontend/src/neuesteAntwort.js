import { useEffect, useRef, useState } from 'react';

export function erzeugeNeuesteAntwort(beiFehlerAenderung = () => {}) {
  const zaehler = {};
  const fehlgeschlagen = new Set();

  function fehlerZustandSetzen(schluessel, istFehler) {
    const warFehler = fehlgeschlagen.size > 0;
    if (istFehler) fehlgeschlagen.add(schluessel);
    else fehlgeschlagen.delete(schluessel);
    const istFehlerJetzt = fehlgeschlagen.size > 0;
    if (warFehler !== istFehlerJetzt) beiFehlerAenderung(istFehlerJetzt);
  }

  return function neueste(schluessel, abruf, uebernehmen) {
    zaehler[schluessel] = (zaehler[schluessel] ?? 0) + 1;
    const eigeneNummer = zaehler[schluessel];
    return abruf.then((daten) => {
      if (eigeneNummer !== zaehler[schluessel]) return;
      fehlerZustandSetzen(schluessel, false);
      uebernehmen(daten);
    }, (fehler) => {
      if (eigeneNummer === zaehler[schluessel]) fehlerZustandSetzen(schluessel, true);
      throw fehler;
    });
  };
}

const WIEDERHOLUNG_NACH_MS = [3000, 10000, 30000];

export function useNeuesteAntwort(erneutLaden) {
  const [ladefehler, setLadefehler] = useState(false);
  const [versuch, setVersuch] = useState(0);
  const merker = useRef(null);
  if (merker.current === null) merker.current = erzeugeNeuesteAntwort(setLadefehler);
  const aktuellesNeuLaden = useRef(erneutLaden);
  aktuellesNeuLaden.current = erneutLaden;

  useEffect(() => {
    if (!ladefehler) {
      setVersuch(0);
      return undefined;
    }
    if (!aktuellesNeuLaden.current || versuch >= WIEDERHOLUNG_NACH_MS.length) return undefined;
    const timer = setTimeout(() => {
      setVersuch(versuch + 1);
      aktuellesNeuLaden.current();
    }, WIEDERHOLUNG_NACH_MS[versuch]);
    return () => clearTimeout(timer);
  }, [ladefehler, versuch]);

  return { neueste: merker.current, ladefehler };
}
