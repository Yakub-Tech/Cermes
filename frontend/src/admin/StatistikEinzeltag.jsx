import { useState } from 'react';
import { apiGet } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { heutigesDatum, datumAnzeigen } from './datum.js';
import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';
import { Kennzahlen, ArtikelDiagramme, BalkenDiagramm, StornoTabelle } from './statistikKomponenten.jsx';
import { staerkstesElement } from './staerkstesElement.js';
import { beideSprachenName, zweisprachigerName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/statistikEinzeltag.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function StatistikEinzeltag({ sprache = 'de' }) {
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [tage, setTage] = useState([]);
  const [datum, setDatum] = useState(heutigesDatum());
  const [statistik, setStatistik] = useState(null);
  const [artikelListe, setArtikelListe] = useState([]);
  const [stundenArtikel, setStundenArtikel] = useState('');
  const [stunden, setStunden] = useState([]);

  useLiveUpdate(['kaertchen'], () => {
    apiGet('/api/statistik/verkaufstage').then(setTage).catch(() => {});
    apiGet('/api/statistik/artikel').then(setArtikelListe).catch(() => {});
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

  const stundenDaten = stunden.map((s) => ({ ...s, stunde: `${s.stunde}${texte.uhr ? ` ${texte.uhr}` : ''}` }));

  const stossStunde = staerkstesElement(statistik.stunden, 'stueck');
  const stosszeit = stossStunde
    ? `${stossStunde.stunde}–${stossStunde.stunde + 1}${texte.uhr ? ` ${texte.uhr}` : ''}`
    : null;

  const artikelAngezeigt = statistik.artikel.map((a) => ({
    ...a, artikel_name: zweisprachigerName(a.artikel_name, a.artikel_name_tr, sprache),
  }));
  const stornosAngezeigt = statistik.stornos.map((s) => ({
    ...s, artikel_name: zweisprachigerName(s.artikel_name, s.artikel_name_tr, sprache),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => tagWaehlen(heutigesDatum())}
          className={`kaertchen-schatten cursor-pointer rounded-full px-2.5 py-1.5 text-sm ${
            datum === heutigesDatum() ? 'bg-blau font-bold text-flaeche' : 'border border-linie text-schrift-gedimmt hover:bg-flaeche-hell'
          }`}>
          {texte.heute}
        </button>
        <Auswahlmenue wert={datum} onWahl={tagWaehlen}
          optionen={[
            ...(!tage.includes(datum) ? [{ wert: datum, text: datumAnzeigen(datum) }] : []),
            ...tage.map((tag) => ({ wert: tag, text: datumAnzeigen(tag) })),
          ]}
          klasse="text-sm kaertchen-schatten" />
      </div>

      <Kennzahlen gesamt={statistik.gesamt} stosszeit={stosszeit} sprache={sprache} />

      <div className="space-y-2.5">
        <ArtikelDiagramme gesamt={statistik.gesamt} artikel={artikelAngezeigt} leerText={texte.keineVerkaeufe} sprache={sprache} />

        <BalkenDiagramm titel={texte.titelTagesverlauf} daten={stundenDaten}
          xSchluessel="stunde" ySchluessel="stueck" schraegeAchse={false}
          leerText={texte.keineVerkaeufe}
          kinder={
            <Auswahlmenue wert={stundenArtikel} onWahl={stundenArtikelWaehlen}
              optionen={[
                { wert: '', text: texte.alleArtikel },
                ...artikelListe.map((a) => ({ wert: String(a.id), text: beideSprachenName(a.name, a.name_tr) })),
              ]}
              klasse="text-xs" />
          } />

        <StornoTabelle stornos={stornosAngezeigt} sprache={sprache} />
      </div>
    </div>
  );
}
