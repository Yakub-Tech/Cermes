import { useRef, useState } from 'react';
import { apiGet } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Urheberrechtshinweis from '../komponenten/Urheberrechtshinweis.jsx';
import ArtikelKarte from './ArtikelKarte.jsx';
import WarenkorbListe from './WarenkorbListe.jsx';
import FokusAnsicht from './FokusAnsicht.jsx';
import BestellUebersicht from './BestellUebersicht.jsx';

export default function KundeSeite() {
  const [artikelListe, setArtikelListe] = useState([]);
  const [zustand, setZustand] = useState({ warenkorb: [], fokus: null, summe_cent: null, sprache: 'de' });
  const letzteAbfrage = useRef(0);

  useLiveUpdate(['artikel', 'beilagen'], () => {
    apiGet('/api/kunde/artikel').then(setArtikelListe).catch(() => {});
  });

  useLiveUpdate(['kunden_anzeige'], () => {
    letzteAbfrage.current += 1;
    const eigeneAbfrage = letzteAbfrage.current;
    apiGet('/api/kunde/zustand').then((neu) => {
      if (eigeneAbfrage === letzteAbfrage.current) setZustand(neu);
    }).catch(() => {});
  });

  if (zustand.summe_cent !== null) {
    return (
      <>
        <BestellUebersicht warenkorb={zustand.warenkorb} summeCent={zustand.summe_cent} sprache={zustand.sprache} />
        <Urheberrechtshinweis />
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-4 overflow-y-auto px-4 pt-8 pb-4 sm:grid-cols-3 lg:grid-cols-4">
          {artikelListe.map((artikel) => (
            <ArtikelKarte key={artikel.id} artikel={artikel} sprache={zustand.sprache} />
          ))}
          {artikelListe.length === 0 && (
            <p className="col-span-full p-4 text-schrift-gedimmt">
              Aktuell sind keine Artikel verfügbar.
            </p>
          )}
        </div>

        <WarenkorbListe warenkorb={zustand.warenkorb} sprache={zustand.sprache} />
      </div>

      {zustand.fokus && <FokusAnsicht fokus={zustand.fokus} sprache={zustand.sprache} />}
      <Urheberrechtshinweis />
    </div>
  );
}
