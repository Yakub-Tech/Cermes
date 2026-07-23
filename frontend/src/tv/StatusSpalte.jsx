import { Fragment, useEffect, useRef, useState } from 'react';
import { gruppiereNachArtikel } from './gruppierung.js';
import { teileInZeilen } from './zeilenAufteilung.js';
import ArtikelSpalte from './ArtikelSpalte.jsx';

const MINDESTBREITE_PX = 130;
const ABSTAND_PX = 12;
const INNENABSTAND_PX = 24;

export default function StatusSpalte({ titel, titelTuerkisch, kaertchen }) {
  const rahmen = useRef(null);
  const [breite, setBreite] = useState(0);

  useEffect(() => {
    if (!rahmen.current) return;
    const beobachter = new ResizeObserver((eintraege) => {
      setBreite(eintraege[0].contentRect.width);
    });
    beobachter.observe(rahmen.current);
    return () => beobachter.disconnect();
  }, []);

  const gruppen = gruppiereNachArtikel(kaertchen);
  const innenBreite = Math.max(0, breite - INNENABSTAND_PX);
  const { zeilen, jeZeile } = teileInZeilen(gruppen, innenBreite, MINDESTBREITE_PX, ABSTAND_PX);

  const spaltenBreitePx =
    innenBreite > 0
      ? Math.max(MINDESTBREITE_PX, Math.floor((innenBreite - (jeZeile - 1) * ABSTAND_PX) / jeZeile))
      : MINDESTBREITE_PX;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 rounded-t-lg bg-blau py-4 text-center font-display text-4xl text-flaeche">
        <h2 className="sprachwechsel sprachwechsel-de">{titel}</h2>
        <h2 className="sprachwechsel sprachwechsel-tr">{titelTuerkisch}</h2>
      </div>
      <div ref={rahmen} className="flex min-h-0 flex-1 flex-col">
        {zeilen.map((zeile, zeilenIndex) => {
          const zielAnzahl = Math.max(...zeile.map((gruppe) => gruppe.kaertchen.length));
          const istErsteZeile = zeilenIndex === 0;
          const istLetzteZeile = zeilenIndex === zeilen.length - 1;

          const eckenKlasse = istLetzteZeile ? 'rounded-b-lg' : '';

          return (
            <Fragment key={zeilenIndex}>
              {!istErsteZeile && <div className="h-3 shrink-0 bg-blau" />}
              <div
                className={`flex min-h-0 flex-1 gap-3 overflow-hidden bg-flaeche p-3 shadow-sm ${eckenKlasse}`}
              >
                {zeile.map((gruppe) => (
                  <ArtikelSpalte
                    key={gruppe.artikelName}
                    kaertchen={gruppe.kaertchen}
                    zielAnzahl={zielAnzahl}
                    breitePx={spaltenBreitePx}
                  />
                ))}
              </div>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
