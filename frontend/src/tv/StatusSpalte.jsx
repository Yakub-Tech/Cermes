import { useEffect, useRef, useState } from 'react';
import { gruppiereNachArtikel } from './gruppierung.js';
import { teileInZeilen } from './zeilenAufteilung.js';
import ArtikelSpalte from './ArtikelSpalte.jsx';

const MINDESTBREITE_PX = 130;
const ABSTAND_PX = 12;

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
  const { zeilen, jeZeile } = teileInZeilen(gruppen, breite, MINDESTBREITE_PX, ABSTAND_PX);

  const spaltenBreitePx =
    breite > 0
      ? Math.max(MINDESTBREITE_PX, Math.floor((breite - (jeZeile - 1) * ABSTAND_PX) / jeZeile))
      : MINDESTBREITE_PX;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="grid bg-blau py-4 text-center font-display text-4xl text-flaeche">
        <h2 className="sprachwechsel sprachwechsel-de">{titel}</h2>
        <h2 className="sprachwechsel sprachwechsel-tr">{titelTuerkisch}</h2>
      </div>
      <div ref={rahmen} className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        {zeilen.map((zeile, zeilenIndex) => {
          const zielAnzahl = Math.max(...zeile.map((gruppe) => gruppe.kaertchen.length));
          return (
            <div
              key={zeilenIndex}
              className={`flex min-h-0 flex-1 gap-3${
                zeilenIndex > 0 ? ' mt-3 border-t border-navy pt-3' : ''
              }`}
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
          );
        })}
      </div>
    </section>
  );
}
