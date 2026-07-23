import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { formatEuro } from '../api.js';
import { datumAnzeigen } from './datum.js';

export const balkenFarbe = '#10538f';
export const farbeOhneKosten = '#8a97a6';
const achsenFarbe = '#5a6b7d';
const gitterFarbe = '#ccd8e4';

export function KennzahlKachel({ beschriftung, wert, fussnote }) {
  return (
    <div className="rounded-xl border border-linie bg-flaeche px-5 py-4">
      <p className="text-sm text-schrift-gedimmt">{beschriftung}</p>
      <p className="nummer mt-1 text-3xl text-navy">{wert}</p>
      {fussnote && <p className="mt-1 text-xs text-schrift-gedimmt">{fussnote}</p>}
    </div>
  );
}

export function BalkenDiagramm({
  titel, daten, xSchluessel, ySchluessel, werteFormat, kinder, balkenFarbFunktion,
  leerText = 'Keine Verkäufe an diesem Tag.',
}) {
  return (
    <section className="rounded-xl border border-linie bg-flaeche p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg text-schrift">{titel}</h3>
        {kinder}
      </div>
      {daten.length === 0 ? (
        <p className="py-10 text-center text-schrift-gedimmt">{leerText}</p>
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

export function FarbLegende() {
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

export function ArtikelUebersicht({ gesamt, artikel }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <KennzahlKachel beschriftung="Verkaufte Portionen" wert={gesamt.stueck} />
        <KennzahlKachel beschriftung="Umsatz" wert={formatEuro(gesamt.umsatz_cent)} />
        <KennzahlKachel beschriftung="Gewinn" wert={formatEuro(gesamt.gewinn_cent)}
          fussnote={gesamt.stueck_ohne_kosten > 0
            ? `${gesamt.stueck_ohne_kosten} Stück ohne Kostenangabe, Gewinn dort ohne Kostenabzug berechnet`
            : null} />
      </div>

      <BalkenDiagramm titel="Verkaufte Stückzahl pro Artikel" daten={artikel}
        xSchluessel="artikel_name" ySchluessel="stueck" />

      <BalkenDiagramm titel="Umsatz pro Artikel" daten={artikel}
        xSchluessel="artikel_name" ySchluessel="umsatz_cent" werteFormat={formatEuro} />

      <BalkenDiagramm titel="Gewinn pro Artikel" daten={artikel}
        xSchluessel="artikel_name" ySchluessel="gewinn_cent" werteFormat={formatEuro}
        balkenFarbFunktion={(zeile) => (zeile.stueck_ohne_kosten > 0 ? farbeOhneKosten : balkenFarbe)}
        kinder={<FarbLegende />} />
    </>
  );
}

export function StornoTabelle({ stornos, mitDatum = false }) {
  return (
    <section className="rounded-xl border border-linie bg-flaeche p-4">
      <h3 className="mb-3 text-lg">{mitDatum ? 'Stornos in diesem Zeitraum' : 'Stornos an diesem Tag'}</h3>
      {stornos.length === 0 ? (
        <p className="text-schrift-gedimmt">Keine Stornos.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-linie text-sm text-schrift-gedimmt">
              {mitDatum && <th className="px-2 py-2">Datum</th>}
              <th className="px-2 py-2">Uhrzeit</th>
              <th className="px-2 py-2">Nummer</th>
              <th className="px-2 py-2">Artikel</th>
              <th className="px-2 py-2">Betrag</th>
              <th className="px-2 py-2">Storniert von</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linie">
            {stornos.map((storno, index) => (
              <tr key={index}>
                {mitDatum && <td className="px-2 py-2">{datumAnzeigen(storno.datum)}</td>}
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
  );
}
