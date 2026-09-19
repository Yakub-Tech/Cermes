import { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { formatEuro } from '../api.js';
import { datumAnzeigen } from './datum.js';
import { artikelSortieren, sortierOptionen } from './artikelSortierung.js';
import { gewinnmargeBerechnen } from './gewinnmarge.js';
import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/statistikKomponenten.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

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
        <div key={kennzahl.id}
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
  schraegeAchse = true, alleBeschriftungen = false, leerText,
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

export function FarbLegende({ sprache = 'de' }) {
  const texte = sprache === 'tr' ? eigeneTr : eigeneDe;
  return (
    <div className="flex items-center gap-3 text-xs text-schrift-gedimmt">
      <span className="flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: gewinnFarbe }} />
        {texte.mitKosten}
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: farbeOhneKosten }} />
        {texte.ohneKosten}
      </span>
    </div>
  );
}

export function Kennzahlen({ gesamt, stosszeit, sprache = 'de' }) {
  const texte = sprache === 'tr' ? eigeneTr : eigeneDe;
  const zeigtGeld = gesamt.umsatz_cent !== undefined;
  const kostenVollstaendig = !gesamt.stueck_ohne_kosten;
  const marge = zeigtGeld ? gewinnmargeBerechnen(gesamt) : null;
  const margeAnzeige = marge === null ? '–' : (sprache === 'tr' ? `%${marge}` : `${marge} %`);

  const kennzahlen = [
    { id: 'portionen', beschriftung: texte.portionenLabel, wert: gesamt.stueck, farbe: stueckFarbe },
    ...(zeigtGeld ? [
      { id: 'umsatz', beschriftung: texte.umsatzLabel, wert: formatEuro(gesamt.umsatz_cent), farbe: umsatzFarbe },
      {
        id: 'gewinn', beschriftung: texte.gewinnLabel, wert: formatEuro(gesamt.gewinn_cent),
        farbe: kostenVollstaendig ? gewinnFarbe : gewinnNeutralFarbe,
      },
      {
        id: 'marge', beschriftung: texte.margeLabel, wert: margeAnzeige,
        farbe: kostenVollstaendig ? gewinnFarbe : gewinnNeutralFarbe,
      },
    ] : []),
    { id: 'stosszeit', beschriftung: texte.stosszeitLabel, wert: stosszeit ?? '–' },
  ];

  return (
    <div className="space-y-2.5">
      <KennzahlZeile kennzahlen={kennzahlen} />
      {zeigtGeld && gesamt.stueck_ohne_kosten > 0 && (
        <div className="kaertchen-schatten rounded-lg border border-linie bg-flaeche px-4 py-2.5">
          <p className="text-xs italic text-weinrot">
            {texte.stueckOhneKostenVorspann}{gesamt.stueck_ohne_kosten}{texte.stueckOhneKostenNachspann}
          </p>
        </div>
      )}
    </div>
  );
}

export function ArtikelDiagramme({ gesamt, artikel, leerText, sprache = 'de' }) {
  const [sortierung, setSortierung] = useState('alphabetisch');
  const texte = sprache === 'tr' ? eigeneTr : eigeneDe;
  const zeigtGeld = gesamt.umsatz_cent !== undefined;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-xs text-schrift-gedimmt">{texte.sortierungLabel}</span>
        <Auswahlmenue wert={sortierung} onWahl={setSortierung} optionen={sortierOptionen(sprache)}
          klasse="text-xs kaertchen-schatten" />
      </div>

      <BalkenDiagramm titel={texte.titelStueckzahl}
        daten={artikelSortieren(artikel, sortierung, 'stueck')}
        xSchluessel="artikel_name" ySchluessel="stueck" farbe={stueckFarbe}
        leerText={leerText} alleBeschriftungen />

      {zeigtGeld && (
        <>
          <BalkenDiagramm titel={texte.titelUmsatz}
            daten={artikelSortieren(artikel, sortierung, 'umsatz_cent')}
            xSchluessel="artikel_name" ySchluessel="umsatz_cent" werteFormat={formatEuro}
            farbe={umsatzFarbe} leerText={leerText} alleBeschriftungen />

          <BalkenDiagramm titel={texte.titelGewinn}
            daten={artikelSortieren(artikel, sortierung, 'gewinn_cent')}
            xSchluessel="artikel_name" ySchluessel="gewinn_cent" werteFormat={formatEuro}
            farbe={gewinnFarbe}
            balkenFarbFunktion={(zeile) => (zeile.stueck_ohne_kosten > 0 ? farbeOhneKosten : gewinnFarbe)}
            leerText={leerText} kinder={<FarbLegende sprache={sprache} />} alleBeschriftungen />
        </>
      )}
    </div>
  );
}

export function StornoTabelle({ stornos, mitDatum = false, sprache = 'de' }) {
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  return (
    <section className="kaertchen-schatten rounded-lg border border-linie bg-flaeche p-2.5">
      <h3 className="mb-2 text-sm">{mitDatum ? texte.titelZeitraum : texte.titelTag}</h3>
      {stornos.length === 0 ? (
        <p className="text-sm text-schrift-gedimmt">{texte.keineStornos}</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-linie text-xs text-schrift-gedimmt">
              {mitDatum && <th className="px-1.5 py-1.5">{texte.spalteDatum}</th>}
              <th className="px-1.5 py-1.5">{texte.spalteUhrzeit}</th>
              <th className="px-1.5 py-1.5">{texte.spalteNummer}</th>
              <th className="px-1.5 py-1.5">{texte.spalteArtikel}</th>
              <th className="px-1.5 py-1.5">{texte.spalteBetrag}</th>
              <th className="px-1.5 py-1.5">{texte.spalteStorniertVon}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linie text-sm">
            {stornos.map((storno, index) => (
              <tr key={index}>
                {mitDatum && <td className="px-1.5 py-1.5">{datumAnzeigen(storno.datum)}</td>}
                <td className="px-1.5 py-1.5">{storno.zeit}{texte.uhr ? ` ${texte.uhr}` : ''}</td>
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
