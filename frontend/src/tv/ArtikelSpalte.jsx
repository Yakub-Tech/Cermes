import { useMemo } from 'react';
import { useUeberlaufErkennung } from './useUeberlaufErkennung.js';
import TvKarte from './TvKarte.jsx';

const LUECKE_ANZAHL = 2;

export default function ArtikelSpalte({ kaertchen, zielAnzahl = kaertchen.length, breitePx = 130 }) {
  const { rahmen, inhalt, ueberlauf } = useUeberlaufErkennung(kaertchen);
  const lueckeAnzahl = LUECKE_ANZAHL + Math.max(0, zielAnzahl - kaertchen.length);
  const scrollDauerSekunden = (kaertchen.length + lueckeAnzahl) * 3;

  const versatzSekunden = useMemo(
    () => -((Date.now() / 1000) % scrollDauerSekunden),
    [scrollDauerSekunden]
  );

  const liste = (
    <div ref={inhalt} className="space-y-3 p-2">
      {kaertchen.map((k) => <TvKarte key={`${k.nummer}-${k.artikel_name}`} kaertchen={k} />)}
    </div>
  );

  const luecke = (
    <div className="space-y-3 p-2" aria-hidden="true">
      {Array.from({ length: lueckeAnzahl }).map((_, i) => (
        <div key={`luecke-${i}`} className="invisible">
          <TvKarte kaertchen={kaertchen[0]} />
        </div>
      ))}
    </div>
  );

  return (
    <div ref={rahmen}
      className={`shrink-0 grow-0 overflow-hidden ${ueberlauf ? 'verlauf-rand' : ''}`}
      style={{ flexBasis: `${breitePx}px`, width: `${breitePx}px` }}>
      {ueberlauf ? (
        <div className="endlos-scroll"
          style={{
            '--scroll-dauer': `${scrollDauerSekunden}s`,
            animationDelay: `${versatzSekunden}s`,
          }}>
          {liste}
          {luecke}
          <div className="space-y-3 p-2" aria-hidden="true">
            {kaertchen.map((k) => (
              <TvKarte key={`kopie-${k.nummer}-${k.artikel_name}`} kaertchen={k} />
            ))}
          </div>
          {luecke}
        </div>
      ) : liste}
    </div>
  );
}
