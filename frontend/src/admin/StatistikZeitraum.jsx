import { useState } from 'react';
import { apiGet } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { heutigesDatum, datumAnzeigen } from './datum.js';
import { ArtikelUebersicht, BalkenDiagramm, StornoTabelle } from './statistikKomponenten.jsx';

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

export default function StatistikZeitraum() {
  const [verkaufstage, setVerkaufstage] = useState([]);
  const [von, setVon] = useState(null);
  const [bis, setBis] = useState(null);
  const [statistik, setStatistik] = useState(null);
  const [artikelListe, setArtikelListe] = useState([]);
  const [verlaufArtikel, setVerlaufArtikel] = useState('');
  const [verlauf, setVerlauf] = useState([]);

  function statistikLaden(vonWert, bisWert, artikelId) {
    const anhang = artikelId ? `&artikel_id=${artikelId}` : '';
    apiGet(`/api/statistik/zeitraum?von=${vonWert}&bis=${bisWert}${anhang}`).then((s) => {
      setStatistik(s);
      setVerlauf(s.tage);
    }).catch(() => {});
  }

  useLiveUpdate(['kaertchen'], () => {
    apiGet('/api/statistik/verkaufstage').then((neueTage) => {
      setVerkaufstage(neueTage);
      if (von === null) {
        const vorauswahl = vorauswahlBerechnen(neueTage);
        setVon(vorauswahl.von);
        setBis(vorauswahl.bis);
        if (vorauswahl.von !== null) statistikLaden(vorauswahl.von, vorauswahl.bis, verlaufArtikel);
      } else {
        statistikLaden(von, bis, verlaufArtikel);
      }
    }).catch(() => {});
    apiGet('/api/artikel').then(setArtikelListe).catch(() => {});
  });

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

  const verlaufDaten = verlauf.map((v) => ({ ...v, tag: datumAnzeigen(v.tag) }));
  const vonOptionen = verkaufstage.filter((tag) => tag <= bis);
  const bisOptionen = verkaufstage.filter((tag) => tag >= von);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-schrift-gedimmt">Von</span>
        <select value={von} onChange={(e) => vonWaehlen(e.target.value)}
          className="rounded-lg border border-linie bg-flaeche px-3 py-2 outline-none focus:border-blau-hell">
          {vonOptionen.map((tag) => <option key={tag} value={tag}>{datumAnzeigen(tag)}</option>)}
        </select>
        <span className="text-schrift-gedimmt">Bis</span>
        <select value={bis} onChange={(e) => bisWaehlen(e.target.value)}
          className="rounded-lg border border-linie bg-flaeche px-3 py-2 outline-none focus:border-blau-hell">
          {bisOptionen.map((tag) => <option key={tag} value={tag}>{datumAnzeigen(tag)}</option>)}
        </select>
      </div>

      <ArtikelUebersicht gesamt={statistik.gesamt} artikel={statistik.artikel} />

      <BalkenDiagramm titel="Verkäufe pro Tag" daten={verlaufDaten}
        xSchluessel="tag" ySchluessel="stueck"
        leerText="Keine Verkäufe in diesem Zeitraum."
        kinder={
          <select value={verlaufArtikel}
            onChange={(e) => verlaufArtikelWaehlen(e.target.value)}
            className="rounded-lg border border-linie bg-grund px-3 py-1 text-sm outline-none focus:border-blau-hell">
            <option value="">Alle Artikel</option>
            {artikelListe.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        } />

      <StornoTabelle stornos={statistik.stornos} mitDatum />
    </div>
  );
}
