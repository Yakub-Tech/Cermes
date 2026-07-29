import { useState } from 'react';
import { apiGet } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { heutigesDatum, datumAnzeigen } from './datum.js';
import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';
import { ArtikelUebersicht, BalkenDiagramm, StornoTabelle } from './statistikKomponenten.jsx';

export default function StatistikEinzeltag() {
  const [tage, setTage] = useState([]);
  const [datum, setDatum] = useState(heutigesDatum());
  const [statistik, setStatistik] = useState(null);
  const [artikelListe, setArtikelListe] = useState([]);
  const [stundenArtikel, setStundenArtikel] = useState('');
  const [stunden, setStunden] = useState([]);

  useLiveUpdate(['kaertchen'], () => {
    apiGet('/api/statistik/verkaufstage').then(setTage).catch(() => {});
    apiGet('/api/artikel').then(setArtikelListe).catch(() => {});
    apiGet(`/api/statistik/tag/${datum}`).then((s) => {
      setStatistik(s);
      if (stundenArtikel === '') setStunden(s.stunden);
    }).catch(() => {});
    if (stundenArtikel !== '') {
      apiGet(`/api/statistik/tag/${datum}?artikel_id=${stundenArtikel}`)
        .then((s) => setStunden(s.stunden)).catch(() => {});
    }
  });

  function tagWaehlen(neuesDatum) {
    setDatum(neuesDatum);
    setStundenArtikel('');
    apiGet(`/api/statistik/tag/${neuesDatum}`).then((s) => {
      setStatistik(s);
      setStunden(s.stunden);
    }).catch(() => {});
  }

  function stundenArtikelWaehlen(artikelId) {
    setStundenArtikel(artikelId);
    const anhang = artikelId === '' ? '' : `?artikel_id=${artikelId}`;
    apiGet(`/api/statistik/tag/${datum}${anhang}`)
      .then((s) => setStunden(s.stunden)).catch(() => {});
  }

  if (!statistik) return null;

  const stundenDaten = stunden.map((s) => ({ ...s, stunde: `${s.stunde} Uhr` }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => tagWaehlen(heutigesDatum())}
          className={`cursor-pointer rounded-full px-2.5 py-1.5 ${
            datum === heutigesDatum() ? 'bg-blau font-bold text-flaeche' : 'border border-linie text-schrift-gedimmt hover:bg-flaeche-hell'
          }`}>
          Heute
        </button>
        <Auswahlmenue wert={datum} onWahl={tagWaehlen}
          optionen={[
            ...(!tage.includes(datum) ? [{ wert: datum, text: datumAnzeigen(datum) }] : []),
            ...tage.map((tag) => ({ wert: tag, text: datumAnzeigen(tag) })),
          ]} />
      </div>

      <ArtikelUebersicht gesamt={statistik.gesamt} artikel={statistik.artikel} />

      <BalkenDiagramm titel="Verkäufe im Tagesverlauf" daten={stundenDaten}
        xSchluessel="stunde" ySchluessel="stueck"
        kinder={
          <Auswahlmenue wert={stundenArtikel} onWahl={stundenArtikelWaehlen}
            optionen={[
              { wert: '', text: 'Alle Artikel' },
              ...artikelListe.map((a) => ({ wert: String(a.id), text: a.name })),
            ]}
            klasse="text-xs" />
        } />

      <StornoTabelle stornos={statistik.stornos} />
    </div>
  );
}
