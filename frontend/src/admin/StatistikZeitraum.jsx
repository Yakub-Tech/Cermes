import { useState } from 'react';
import { apiGet } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import LadefehlerHinweis from '../komponenten/LadefehlerHinweis.jsx';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { useNurAktivLaden } from '../useNurAktivLaden.js';
import { heutigesDatum, datumAnzeigen } from './datum.js';
import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';
import { Kennzahlen, ArtikelDiagramme, BalkenDiagramm, StornoTabelle } from './statistikKomponenten.jsx';
import { staerkstesElement } from './staerkstesElement.js';
import { beideSprachenName, zweisprachigerName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/statistikZeitraum.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

function vorauswahlBerechnen(verkaufstage) {
  if (verkaufstage.length === 0) return { von: null, bis: null };

  const heute = heutigesDatum();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const p = (n) => String(n).padStart(2, '0');
  const fensterStart = `${start.getFullYear()}-${p(start.getMonth() + 1)}-${p(start.getDate())}`;

  const imFenster = verkaufstage.filter((tag) => tag >= fensterStart && tag <= heute);
  if (imFenster.length > 0) {
    return { von: imFenster[imFenster.length - 1], bis: imFenster[0] };
  }
  return { von: verkaufstage[0], bis: verkaufstage[0] };
}

export default function StatistikZeitraum({ sprache = 'de', aktiv = true }) {
  const { neueste, ladefehler } = useNeuesteAntwort(laden);
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [verkaufstage, setVerkaufstage] = useState([]);
  const [von, setVon] = useState(null);
  const [bis, setBis] = useState(null);
  const [statistik, setStatistik] = useState(null);
  const [artikelListe, setArtikelListe] = useState([]);
  const [verlaufArtikel, setVerlaufArtikel] = useState('');
  const [gefilterterVerlauf, setGefilterterVerlauf] = useState(null);

  function statistikLaden(vonWert, bisWert, artikelId) {
    const grundUrl = `/api/statistik/zeitraum?von=${vonWert}&bis=${bisWert}`;
    neueste('zeitraum', apiGet(grundUrl), setStatistik).catch(() => {});
    if (artikelId) {
      neueste('verlauf', apiGet(`${grundUrl}&artikel_id=${artikelId}`).then((s) => s.tage),
        setGefilterterVerlauf).catch(() => {});
    } else {
      neueste('verlauf', Promise.resolve(null), setGefilterterVerlauf);
    }
  }

  function laden() {
    if (von !== null) statistikLaden(von, bis, verlaufArtikel);
    neueste('verkaufstage', apiGet('/api/statistik/verkaufstage'), (neueTage) => {
      setVerkaufstage(neueTage);
      if (von !== null) return;
      const vorauswahl = vorauswahlBerechnen(neueTage);
      setVon(vorauswahl.von);
      setBis(vorauswahl.bis);
      if (vorauswahl.von !== null) statistikLaden(vorauswahl.von, vorauswahl.bis, verlaufArtikel);
    }).catch(() => {});
    neueste('artikel', apiGet('/api/statistik/artikel'), setArtikelListe).catch(() => {});
  }
  useLiveUpdate(['kaertchen'], useNurAktivLaden(aktiv, laden));

  function vonWaehlen(neuesVon) {
    setVon(neuesVon);
    statistikLaden(neuesVon, bis, verlaufArtikel);
  }

  function bisWaehlen(neuesBis) {
    setBis(neuesBis);
    statistikLaden(von, neuesBis, verlaufArtikel);
  }

  function verlaufArtikelWaehlen(artikelId) {
    setVerlaufArtikel(artikelId);
    statistikLaden(von, bis, artikelId);
  }

  if (!statistik) return null;

  const verlaufDaten = (gefilterterVerlauf ?? statistik.tage).map((v) => ({ ...v, tag: datumAnzeigen(v.tag) }));
  const vonOptionen = verkaufstage.filter((tag) => tag <= bis);
  const bisOptionen = verkaufstage.filter((tag) => tag >= von);

  const stosstag = staerkstesElement(statistik.tage, 'stueck');
  const stosszeit = stosstag ? datumAnzeigen(stosstag.tag) : null;

  const artikelAngezeigt = statistik.artikel.map((a) => ({
    ...a, artikel_name: zweisprachigerName(a.artikel_name, a.artikel_name_tr, sprache),
  }));
  const stornosAngezeigt = statistik.stornos.map((s) => ({
    ...s, artikel_name: zweisprachigerName(s.artikel_name, s.artikel_name_tr, sprache),
  }));

  return (
    <div className="space-y-8">
      {ladefehler && <LadefehlerHinweis sprache={sprache} onErneut={laden} />}
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-[62px] text-right text-sm text-schrift-gedimmt">{texte.von}</span>
        <Auswahlmenue wert={von} onWahl={vonWaehlen}
          optionen={vonOptionen.map((tag) => ({ wert: tag, text: datumAnzeigen(tag) }))}
          klasse="text-sm kaertchen-schatten" />
        <span className="text-sm text-schrift-gedimmt">{texte.bis}</span>
        <Auswahlmenue wert={bis} onWahl={bisWaehlen}
          optionen={bisOptionen.map((tag) => ({ wert: tag, text: datumAnzeigen(tag) }))}
          klasse="text-sm kaertchen-schatten" />
      </div>

      <Kennzahlen gesamt={statistik.gesamt} stosszeit={stosszeit} sprache={sprache} />

      <div className="space-y-2.5">
        <ArtikelDiagramme gesamt={statistik.gesamt} artikel={artikelAngezeigt} leerText={texte.keineVerkaeufe} sprache={sprache} />

        <BalkenDiagramm titel={texte.titelProTag} daten={verlaufDaten}
          xSchluessel="tag" ySchluessel="stueck"
          leerText={texte.keineVerkaeufe}
          kinder={
            <Auswahlmenue wert={verlaufArtikel} onWahl={verlaufArtikelWaehlen}
              optionen={[
                { wert: '', text: texte.alleArtikel },
                ...artikelListe.map((a) => ({ wert: String(a.id), text: beideSprachenName(a.name, a.name_tr) })),
              ]}
              klasse="text-xs" />
          } />

        <StornoTabelle stornos={stornosAngezeigt} mitDatum sprache={sprache} />
      </div>
    </div>
  );
}
