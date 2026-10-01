import { useEffect, useRef, useState } from 'react';
import { warenkorbParken, eintragZurueckholen, geparkteAlsText, geparkteAusText } from './geparkt.js';
import { de, tr } from '../sprache/geparkt.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

function speicherSchluessel(kassenNummer) {
  return `cermes-geparkt-${kassenNummer}`;
}

function lesen(kassenNummer) {
  try {
    return geparkteAusText(sessionStorage.getItem(speicherSchluessel(kassenNummer)));
  } catch {
    return [];
  }
}

export function useGeparkte({ kassenNummer, sprache, positionen, setPositionen, artikelListe, naechsterSchluessel, meldeHinweis, vorParken }) {
  const [geparkte, setGeparkte] = useState(() => lesen(kassenNummer));
  const [dialogOffen, setDialogOffen] = useState(false);
  const texte = sprache === 'tr' ? tr : de;
  const geladenFuer = useRef(kassenNummer);

  useEffect(() => {
    if (geladenFuer.current !== kassenNummer) {
      geladenFuer.current = kassenNummer;
      setGeparkte(lesen(kassenNummer));
      return;
    }
    try {
      sessionStorage.setItem(speicherSchluessel(kassenNummer), geparkteAlsText(geparkte));
    } catch {
    }
  }, [geparkte, kassenNummer]);

  function parken() {
    const ergebnis = warenkorbParken(geparkte, positionen, Date.now());
    if (ergebnis.fehler) {
      meldeHinweis(sprache === 'tr' ? ergebnis.fehler.tr : ergebnis.fehler.de);
      return;
    }
    meldeHinweis('');
    setGeparkte(ergebnis.geparkte);
    setPositionen([]);
    vorParken();
  }

  function zurueckholen(eintrag) {
    if (positionen.length > 0) {
      meldeHinweis(texte.warenkorbNichtLeer);
      setDialogOffen(false);
      return;
    }
    if (artikelListe.length === 0) {
      meldeHinweis(texte.artikelFehlen);
      return;
    }
    const ergebnis = eintragZurueckholen(eintrag, artikelListe, naechsterSchluessel);
    const zeilen = [];
    if (ergebnis.entfernt.length > 0) {
      const namen = ergebnis.entfernt.map((e) => zweisprachigerName(e.artikel_name, e.artikel_name_tr, sprache));
      zeilen.push(`${texte.entferntVorspann} ${namen.join(', ')}.`);
    }
    if (ergebnis.positionen.length === 0) zeilen.push(texte.allesEntfernt);
    if (ergebnis.preiseGeaendert && ergebnis.positionen.length > 0) zeilen.push(texte.preiseGeaendert);
    meldeHinweis(zeilen.join(' '));
    setPositionen(ergebnis.positionen);
    setGeparkte((alte) => alte.filter((e) => e.id !== eintrag.id));
    setDialogOffen(false);
  }

  function verwerfen(eintrag) {
    setGeparkte((alte) => alte.filter((e) => e.id !== eintrag.id));
  }

  return { geparkte, dialogOffen, setDialogOffen, parken, zurueckholen, verwerfen };
}
