import { useEffect, useRef, useState } from 'react';
import { gruppiereNachArtikel } from './gruppierung.js';
import { teileInZeilen } from './zeilenAufteilung.js';
import ArtikelSpalte from './ArtikelSpalte.jsx';

const MINDESTBREITE_PX = 130;
const ABSTAND_PX = 12;

export default function StatusSpalte({ titel, kaertchen }) {
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
  const zeilen = teileInZeilen(gruppen, breite, MINDESTBREITE_PX, ABSTAND_PX);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <h2 className="bg-blau py-4 text-center font-display text-4xl text-flaeche">{titel}</h2>
      <div ref={rahmen} className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        {zeilen.map((zeile, zeilenIndex) => (
          <div
            key={zeilenIndex}
            className={`flex min-h-0 flex-1 gap-3${
              zeilenIndex > 0 ? ' mt-3 border-t border-navy pt-3' : ''
            }`}
          >
            {zeile.map((gruppe) => (
              <ArtikelSpalte key={gruppe.artikelName} kaertchen={gruppe.kaertchen} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
