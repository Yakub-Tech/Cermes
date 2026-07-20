import { useUeberlaufErkennung } from './useUeberlaufErkennung.js';
import TvKarte from './TvKarte.jsx';

export default function ArtikelSpalte({ kaertchen }) {
  const { rahmen, inhalt, ueberlauf } = useUeberlaufErkennung(kaertchen);

  const liste = (
    <div ref={inhalt} className="space-y-3 p-2">
      {kaertchen.map((k) => <TvKarte key={`${k.nummer}-${k.artikel_name}`} kaertchen={k} />)}
    </div>
  );

  return (
    <div ref={rahmen} className="min-w-[130px] shrink grow-0 basis-1/6 overflow-hidden">
      {ueberlauf ? (
        <div className="endlos-scroll"
          style={{ '--scroll-dauer': `${kaertchen.length * 3}s` }}>
          {liste}
          <div className="space-y-3 p-2" aria-hidden="true">
            {kaertchen.map((k) => (
              <TvKarte key={`kopie-${k.nummer}-${k.artikel_name}`} kaertchen={k} />
            ))}
          </div>
        </div>
      ) : liste}
    </div>
  );
}
