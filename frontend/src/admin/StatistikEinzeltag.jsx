import { useState } from 'react';
import { apiGet } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import LadefehlerHinweis from '../komponenten/LadefehlerHinweis.jsx';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { useNurAktivLaden } from '../useNurAktivLaden.js';
import { heutigesDatum, datumAnzeigen } from './datum.js';
import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';
import { Button } from '@/komponenten/ui/button';
import ExportKnoepfe from './ExportKnoepfe.jsx';
import { Kennzahlen, ArtikelDiagramme, BalkenDiagramm, StornoTabelle } from './statistikKomponenten.jsx';
import { staerkstesElement } from './staerkstesElement.js';
import { beideSprachenName, zweisprachigerName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/statistikEinzeltag.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function StatistikEinzeltag({ sprache = 'de', aktiv = true }) {
  const { neueste, ladefehler } = useNeuesteAntwort(laden);
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [tage, setTage] = useState([]);
  const [datum, setDatum] = useState(heutigesDatum());
  const [statistik, setStatistik] = useState(null);
  const [artikelListe, setArtikelListe] = useState([]);
  const [stundenArtikel, setStundenArtikel] = useState('');
  const [sortierung, setSortierung] = useState('alphabetisch');
  const [gefilterteStunden, setGefilterteStunden] = useState(null);

  function stundenLaden(tagesDatum, artikelId) {
    if (artikelId === '') {
      neueste('stunden', Promise.resolve(null), setGefilterteStunden);
      return;
    }
    neueste('stunden', apiGet(`/api/statistik/tag/${tagesDatum}?artikel_id=${artikelId}`)
      .then((s) => s.stunden), setGefilterteStunden).catch(() => {});
  }

  function laden() {
    neueste('tage', apiGet('/api/statistik/verkaufstage'), setTage).catch(() => {});
    neueste('artikel', apiGet('/api/statistik/artikel'), setArtikelListe).catch(() => {});
    neueste('tag', apiGet(`/api/statistik/tag/${datum}`), setStatistik).catch(() => {});
    stundenLaden(datum, stundenArtikel);
  }
  useLiveUpdate(['kaertchen'], useNurAktivLaden(aktiv, laden));

  function tagWaehlen(neuesDatum) {
    setDatum(neuesDatum);
    setStundenArtikel('');
    stundenLaden(neuesDatum, '');
    neueste('tag', apiGet(`/api/statistik/tag/${neuesDatum}`), setStatistik).catch(() => {});
  }

  function stundenArtikelWaehlen(artikelId) {
    setStundenArtikel(artikelId);
    stundenLaden(datum, artikelId);
  }

  if (!statistik) {
    if (ladefehler) return <LadefehlerHinweis sprache={sprache} onErneut={laden} />;
    return null;
  }

  const stundenDaten = (gefilterteStunden ?? statistik.stunden).map((s) => ({ ...s, stunde: `${s.stunde}${texte.uhr ? ` ${texte.uhr}` : ''}` }));

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

  const gewaehlterArtikel = artikelListe.find((a) => String(a.id) === stundenArtikel);
  const stundenArtikelName = gewaehlterArtikel ? beideSprachenName(gewaehlterArtikel.name, gewaehlterArtikel.name_tr) : '';

  return (
    <div className="space-y-8">
      {ladefehler && <LadefehlerHinweis sprache={sprache} onErneut={laden} />}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={datum === heutigesDatum() ? 'default' : 'outline'}
          onClick={() => tagWaehlen(heutigesDatum())} className="px-2.5 text-sm font-semibold">
          {texte.heute}
        </Button>
        <Auswahlmenue wert={datum} onWahl={tagWaehlen}
          optionen={[
            ...(!tage.includes(datum) ? [{ wert: datum, text: datumAnzeigen(datum) }] : []),
            ...tage.map((tag) => ({ wert: tag, text: datumAnzeigen(tag) })),
          ]}
          klasse="text-sm kaertchen-schatten" />
        <ExportKnoepfe sprache={sprache} eingabe={{
          ansicht: 'einzeltag', von: datum, bis: datum, sprache, gesamt: statistik.gesamt, stosszeit,
          artikel: artikelAngezeigt, sortierung, verlauf: stundenDaten.map((s) => ({ beschriftung: s.stunde, stueck: s.stueck })),
          verlaufArtikelName: stundenArtikelName, stornos: stornosAngezeigt,
        }} />
      </div>

      <Kennzahlen gesamt={statistik.gesamt} stosszeit={stosszeit} sprache={sprache} />

      <div className="space-y-2.5">
        <ArtikelDiagramme gesamt={statistik.gesamt} artikel={artikelAngezeigt} leerText={texte.keineVerkaeufe}
          sortierung={sortierung} onSortierung={setSortierung} sprache={sprache} />

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
