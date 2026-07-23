import { useState } from 'react';
import { apiGet } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { heutigesDatum, datumAnzeigen } from './datum.js';
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => tagWaehlen(heutigesDatum())}
          className={`cursor-pointer rounded-lg px-4 py-2 ${
            datum === heutigesDatum() ? 'bg-blau font-bold text-flaeche' : 'border border-linie text-schrift-gedimmt hover:bg-flaeche-hell'
          }`}>
          Heute
        </button>
        <select value={datum} onChange={(e) => tagWaehlen(e.target.value)}
          className="rounded-lg border border-linie bg-flaeche px-3 py-2 outline-none focus:border-blau-hell">
          {!tage.includes(datum) && <option value={datum}>{datumAnzeigen(datum)}</option>}
          {tage.map((tag) => <option key={tag} value={tag}>{datumAnzeigen(tag)}</option>)}
        </select>
      </div>

      <ArtikelUebersicht gesamt={statistik.gesamt} artikel={statistik.artikel} />

      <BalkenDiagramm titel="Verkäufe im Tagesverlauf" daten={stundenDaten}
        xSchluessel="stunde" ySchluessel="stueck"
        kinder={
          <select value={stundenArtikel}
            onChange={(e) => stundenArtikelWaehlen(e.target.value)}
            className="rounded-lg border border-linie bg-grund px-3 py-1 text-sm outline-none focus:border-blau-hell">
            <option value="">Alle Artikel</option>
            {artikelListe.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        } />

      <StornoTabelle stornos={statistik.stornos} />
    </div>
  );
}
