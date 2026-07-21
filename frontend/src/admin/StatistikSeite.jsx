import { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { apiGet, formatEuro } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { heutigesDatum, datumAnzeigen } from './datum.js';

const balkenFarbe = '#10538f';
const farbeOhneKosten = '#8a97a6';
const achsenFarbe = '#5a6b7d';
const gitterFarbe = '#ccd8e4';

function KennzahlKachel({ beschriftung, wert, fussnote }) {
  return (
    <div className="rounded-xl border border-linie bg-flaeche px-5 py-4">
      <p className="text-sm text-schrift-gedimmt">{beschriftung}</p>
      <p className="nummer mt-1 text-3xl text-navy">{wert}</p>
      {fussnote && <p className="mt-1 text-xs text-schrift-gedimmt">{fussnote}</p>}
    </div>
  );
}

function BalkenDiagramm({
  titel, daten, xSchluessel, ySchluessel, werteFormat, kinder, balkenFarbFunktion,
}) {
  return (
    <section className="rounded-xl border border-linie bg-flaeche p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg text-schrift">{titel}</h3>
        {kinder}
      </div>
      {daten.length === 0 ? (
        <p className="py-10 text-center text-schrift-gedimmt">Keine Verkäufe an diesem Tag.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={daten} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={gitterFarbe} vertical={false} />
            <XAxis dataKey={xSchluessel} stroke={achsenFarbe} tickLine={false} />
            <YAxis stroke={achsenFarbe} tickLine={false} allowDecimals={false}
              tickFormatter={werteFormat} width={70} />
            <Tooltip cursor={{ fill: 'rgba(16, 83, 143, 0.08)' }}
              contentStyle={{
                backgroundColor: '#ffffff', border: '1px solid #ccd8e4',
                borderRadius: 8, color: '#16202b',
              }}
              formatter={(wert) => [werteFormat ? werteFormat(wert) : wert, null]}
              labelStyle={{ color: '#5a6b7d' }} />
            <Bar dataKey={ySchluessel} fill={balkenFarbe} radius={[4, 4, 0, 0]} maxBarSize={48}>
              {balkenFarbFunktion && daten.map((zeile) => (
                <Cell key={zeile[xSchluessel]} fill={balkenFarbFunktion(zeile)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

function FarbLegende() {
  return (
    <div className="flex items-center gap-3 text-xs text-schrift-gedimmt">
      <span className="flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: balkenFarbe }} />
        mit hinterlegten Kosten
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: farbeOhneKosten }} />
        ohne hinterlegte Kosten
      </span>
    </div>
  );
}

export default function StatistikSeite() {
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
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-4 font-display text-2xl text-navy">Statistik</h2>
        <button onClick={() => tagWaehlen(heutigesDatum())}
          className={`rounded-lg px-4 py-2 ${
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

      <div className="grid grid-cols-3 gap-4">
        <KennzahlKachel beschriftung="Verkaufte Portionen" wert={statistik.gesamt.stueck} />
        <KennzahlKachel beschriftung="Umsatz" wert={formatEuro(statistik.gesamt.umsatz_cent)} />
        <KennzahlKachel beschriftung="Gewinn" wert={formatEuro(statistik.gesamt.gewinn_cent)}
          fussnote={statistik.gesamt.stueck_ohne_kosten > 0
            ? `${statistik.gesamt.stueck_ohne_kosten} Stück ohne Kostenangabe nicht eingerechnet`
            : null} />
      </div>

      <BalkenDiagramm titel="Verkaufte Stückzahl pro Artikel" daten={statistik.artikel}
        xSchluessel="artikel_name" ySchluessel="stueck" />

      <BalkenDiagramm titel="Umsatz pro Artikel" daten={statistik.artikel}
        xSchluessel="artikel_name" ySchluessel="umsatz_cent" werteFormat={formatEuro} />

      <BalkenDiagramm titel="Gewinn pro Artikel" daten={statistik.artikel}
        xSchluessel="artikel_name" ySchluessel="gewinn_cent" werteFormat={formatEuro}
        balkenFarbFunktion={(zeile) => (zeile.stueck_ohne_kosten > 0 ? farbeOhneKosten : balkenFarbe)}
        kinder={<FarbLegende />} />

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

      <section className="rounded-xl border border-linie bg-flaeche p-4">
        <h3 className="mb-3 text-lg">Stornos an diesem Tag</h3>
        {statistik.stornos.length === 0 ? (
          <p className="text-schrift-gedimmt">Keine Stornos.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-linie text-sm text-schrift-gedimmt">
                <th className="px-2 py-2">Uhrzeit</th>
                <th className="px-2 py-2">Nummer</th>
                <th className="px-2 py-2">Artikel</th>
                <th className="px-2 py-2">Betrag</th>
                <th className="px-2 py-2">Storniert von</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linie">
              {statistik.stornos.map((storno, index) => (
                <tr key={index}>
                  <td className="px-2 py-2">{storno.zeit} Uhr</td>
                  <td className="nummer px-2 py-2">{storno.nummer}</td>
                  <td className="px-2 py-2">{storno.artikel_name}</td>
                  <td className="nummer px-2 py-2">{formatEuro(storno.preis_cent)}</td>
                  <td className="px-2 py-2">{storno.storniert_von}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
