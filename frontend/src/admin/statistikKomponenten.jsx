import { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { formatEuro } from '../api.js';
import { datumAnzeigen } from './datum.js';
import { artikelSortieren, SORTIER_OPTIONEN } from './artikelSortierung.js';
import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';

export const stueckFarbe = '#2563A6';
export const umsatzFarbe = '#0F8B8D';
export const gewinnFarbe = '#2E8B57';
export const farbeOhneKosten = '#8a97a6';
const gewinnNeutralFarbe = '#5a6b7d';
const achsenFarbe = '#5a6b7d';
const gitterFarbe = '#ccd8e4';
const ACHSEN_WINKEL_GRAD = -30;
const ACHSEN_WINKEL_RAD = (ACHSEN_WINKEL_GRAD * Math.PI) / 180;
const ACHSEN_COS = Math.cos(ACHSEN_WINKEL_RAD);
const ACHSEN_SIN = Math.sin(ACHSEN_WINKEL_RAD);
const ZEICHEN_BREITE = 5.3;
const TEXT_ABSTAND = 10;
const ZEILEN_HOEHE = 12;
const BODEN_PUFFER = 6;

function ArtikelAchsenTick({ x, y, payload }) {
  return (
    <text x={x} y={y} dy={TEXT_ABSTAND} textAnchor="end" fill={achsenFarbe} fontSize={10}
      transform={`rotate(${ACHSEN_WINKEL_GRAD}, ${x}, ${y})`}>
      {payload.value}
    </text>
  );
}

export function KennzahlZeile({ kennzahlen }) {
  return (
    <div className="flex gap-2.5">
      {kennzahlen.map((kennzahl) => (
        <div key={kennzahl.beschriftung}
          className="kaertchen-schatten flex-1 rounded-lg border border-linie bg-flaeche px-4 py-4 text-center">
          <p className="text-xs text-schrift-gedimmt">{kennzahl.beschriftung}</p>
          <p className="nummer mt-2 text-3xl" style={kennzahl.farbe ? { color: kennzahl.farbe } : undefined}>
            {kennzahl.wert}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BalkenDiagramm({
  titel, daten, xSchluessel, ySchluessel, werteFormat, kinder, farbe = stueckFarbe, balkenFarbFunktion,
  schraegeAchse = true, alleBeschriftungen = false, leerText = 'Keine Verkäufe an diesem Tag.',
}) {
  const laengsterName = daten.reduce(
    (max, zeile) => Math.max(max, String(zeile[xSchluessel]).length), 0,
  );
  const tiefsterPunkt = laengsterName * ZEICHEN_BREITE * Math.abs(ACHSEN_SIN)
    + (TEXT_ABSTAND + ZEILEN_HOEHE) * Math.abs(ACHSEN_COS);
  const achsenHoehe = schraegeAchse ? Math.max(30, Math.round(tiefsterPunkt) + BODEN_PUFFER) : 24;

  return (
    <section className="kaertchen-schatten rounded-lg border border-linie bg-flaeche p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-sm text-schrift">{titel}</h3>
        {kinder}
      </div>
      {daten.length === 0 ? (
        <p className="py-6 text-center text-sm text-schrift-gedimmt">{leerText}</p>
      ) : (
        <ResponsiveContainer width="100%" height={124 + achsenHoehe}>
          <BarChart data={daten} margin={{ top: 5, right: 5, left: 5, bottom: 12 }}>
            <CartesianGrid stroke={gitterFarbe} vertical={false} />
            <XAxis dataKey={xSchluessel} stroke={achsenFarbe} tickLine={false}
              interval={alleBeschriftungen ? 0 : 'preserveEnd'} height={achsenHoehe}
              tick={schraegeAchse ? <ArtikelAchsenTick /> : { fontSize: 10 }} />
            <YAxis stroke={achsenFarbe} tickLine={false} allowDecimals={false}
              tickFormatter={werteFormat} width={60} tick={{ fontSize: 10 }} />
            <Tooltip cursor={{ fill: 'rgba(16, 83, 143, 0.08)' }}
              contentStyle={{
                backgroundColor: '#ffffff', border: '1px solid #ccd8e4',
                borderRadius: 6, color: '#16202b', fontSize: 12, padding: '4px 8px',
              }}
              formatter={(wert) => [werteFormat ? werteFormat(wert) : wert, null]}
              labelStyle={{ color: '#5a6b7d' }} />
            <Bar dataKey={ySchluessel} fill={farbe} radius={[3, 3, 0, 0]} maxBarSize={32}>
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
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: gewinnFarbe }} />
        mit hinterlegten Kosten
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: farbeOhneKosten }} />
        ohne hinterlegte Kosten
      </span>
    </div>
  );
}

export function Kennzahlen({ gesamt, stosszeit }) {
  const zeigtGeld = gesamt.umsatz_cent !== undefined;
  const kostenVollstaendig = !gesamt.stueck_ohne_kosten;

  const kennzahlen = [
    { beschriftung: 'Verkaufte Portionen', wert: gesamt.stueck, farbe: stueckFarbe },
    ...(zeigtGeld ? [
      { beschriftung: 'Umsatz', wert: formatEuro(gesamt.umsatz_cent), farbe: umsatzFarbe },
      {
        beschriftung: 'Gewinn', wert: formatEuro(gesamt.gewinn_cent),
        farbe: kostenVollstaendig ? gewinnFarbe : gewinnNeutralFarbe,
      },
    ] : []),
    { beschriftung: 'Stoßzeit', wert: stosszeit ?? '–' },
  ];

  return (
    <div className="space-y-2.5">
      <KennzahlZeile kennzahlen={kennzahlen} />
      {zeigtGeld && gesamt.stueck_ohne_kosten > 0 && (
        <div className="kaertchen-schatten rounded-lg border border-linie bg-flaeche px-4 py-2.5">
          <p className="text-xs italic text-weinrot">
            {gesamt.stueck_ohne_kosten} Stück ohne Kostenangabe, Gewinn dort ohne Kostenabzug berechnet
          </p>
        </div>
      )}
    </div>
  );
}

export function ArtikelDiagramme({ gesamt, artikel }) {
  const [sortierung, setSortierung] = useState('alphabetisch');
  const zeigtGeld = gesamt.umsatz_cent !== undefined;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-xs text-schrift-gedimmt">Sortierung</span>
        <Auswahlmenue wert={sortierung} onWahl={setSortierung} optionen={SORTIER_OPTIONEN}
          klasse="text-xs kaertchen-schatten" />
      </div>

      <BalkenDiagramm titel="Verkaufte Stückzahl pro Artikel"
        daten={artikelSortieren(artikel, sortierung, 'stueck')}
        xSchluessel="artikel_name" ySchluessel="stueck" farbe={stueckFarbe}
        alleBeschriftungen />

      {zeigtGeld && (
        <>
          <BalkenDiagramm titel="Umsatz pro Artikel"
            daten={artikelSortieren(artikel, sortierung, 'umsatz_cent')}
            xSchluessel="artikel_name" ySchluessel="umsatz_cent" werteFormat={formatEuro}
            farbe={umsatzFarbe} alleBeschriftungen />

          <BalkenDiagramm titel="Gewinn pro Artikel"
            daten={artikelSortieren(artikel, sortierung, 'gewinn_cent')}
            xSchluessel="artikel_name" ySchluessel="gewinn_cent" werteFormat={formatEuro}
            farbe={gewinnFarbe}
            balkenFarbFunktion={(zeile) => (zeile.stueck_ohne_kosten > 0 ? farbeOhneKosten : gewinnFarbe)}
            kinder={<FarbLegende />} alleBeschriftungen />
        </>
      )}
    </div>
  );
}

export function StornoTabelle({ stornos, mitDatum = false }) {
  return (
    <section className="kaertchen-schatten rounded-lg border border-linie bg-flaeche p-2.5">
      <h3 className="mb-2 text-sm">{mitDatum ? 'Stornos in diesem Zeitraum' : 'Stornos an diesem Tag'}</h3>
      {stornos.length === 0 ? (
        <p className="text-sm text-schrift-gedimmt">Keine Stornos.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-linie text-xs text-schrift-gedimmt">
              {mitDatum && <th className="px-1.5 py-1.5">Datum</th>}
              <th className="px-1.5 py-1.5">Uhrzeit</th>
              <th className="px-1.5 py-1.5">Nummer</th>
              <th className="px-1.5 py-1.5">Artikel</th>
              <th className="px-1.5 py-1.5">Betrag</th>
              <th className="px-1.5 py-1.5">Storniert von</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linie text-sm">
            {stornos.map((storno, index) => (
              <tr key={index}>
                {mitDatum && <td className="px-1.5 py-1.5">{datumAnzeigen(storno.datum)}</td>}
                <td className="px-1.5 py-1.5">{storno.zeit} Uhr</td>
                <td className="nummer px-1.5 py-1.5">{storno.nummer}</td>
                <td className="px-1.5 py-1.5">{storno.artikel_name}</td>
                <td className="nummer px-1.5 py-1.5">{formatEuro(storno.preis_cent)}</td>
                <td className="px-1.5 py-1.5">{storno.storniert_von}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
