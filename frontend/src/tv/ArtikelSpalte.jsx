import { useUeberlaufErkennung } from './useUeberlaufErkennung.js';
import TvKarte from './TvKarte.jsx';

const LUECKE_ANZAHL = 2;

export default function ArtikelSpalte({ kaertchen }) {
  const { rahmen, inhalt, ueberlauf } = useUeberlaufErkennung(kaertchen);

  const liste = (
    <div ref={inhalt} className="space-y-3 p-2">
      {kaertchen.map((k) => <TvKarte key={`${k.nummer}-${k.artikel_name}`} kaertchen={k} />)}
    </div>
  );

  const luecke = (
    <div className="space-y-3 p-2" aria-hidden="true">
      {Array.from({ length: LUECKE_ANZAHL }).map((_, i) => (
        <div key={`luecke-${i}`} className="invisible aspect-[2/1] rounded-[18px]" />
      ))}
    </div>
  );

  return (
    <div ref={rahmen}
      className={`min-w-[130px] shrink grow-0 basis-1/6 overflow-hidden ${ueberlauf ? 'verlauf-rand' : ''}`}>
      {ueberlauf ? (
        <div className="endlos-scroll"
          style={{ '--scroll-dauer': `${(kaertchen.length + LUECKE_ANZAHL) * 3}s` }}>
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
