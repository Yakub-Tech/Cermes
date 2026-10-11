import { sortiereFuerFluss } from './gruppierung.js';
import { useUeberlaufErkennung } from '../komponenten/useUeberlaufErkennung.js';
import { usePendelScroll } from '../komponenten/usePendelScroll.js';
import { useNeueKaertchen } from './useNeueKaertchen.js';
import TvKarte from './TvKarte.jsx';

const MINDESTBREITE_PX = 130;

export default function StatusSpalte({ titel, titelTuerkisch, titelFarbe = 'text-schrift', kaertchen, neueHervorheben, geladen }) {
  const flussKaertchen = sortiereFuerFluss(kaertchen);
  const { rahmen, inhalt, ueberlauf, ueberlaufPx } = useUeberlaufErkennung(kaertchen);
  const istNeu = useNeueKaertchen(kaertchen, geladen && neueHervorheben);
  const { versatzPx, uebergangSekunden } = usePendelScroll(ueberlaufPx);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className={`grid shrink-0 rounded-t-xl border border-b-0 border-linie bg-flaeche-hell py-4 text-center font-display text-4xl font-semibold tracking-tight ${titelFarbe}`}>
        <h2 className="sprachwechsel sprachwechsel-de">{titel}</h2>
        <h2 className="sprachwechsel sprachwechsel-tr">{titelTuerkisch}</h2>
      </div>
      <div className="kaertchen-schatten min-h-0 flex-1 overflow-hidden rounded-b-xl border border-linie bg-flaeche p-3">
        <div
          ref={rahmen}
          className={`h-full overflow-hidden ${ueberlauf ? 'verlauf-rand' : ''}`}
        >
          <div
            ref={inhalt}
            className="grid content-start gap-3 py-3"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${MINDESTBREITE_PX}px, 1fr))`,
              transform: `translateY(-${versatzPx}px)`,
              transition: `transform ${uebergangSekunden}s linear`,
            }}
          >
            {flussKaertchen.map((k) => (
              <TvKarte key={`${k.nummer}-${k.artikel_name}`} kaertchen={k} neu={istNeu(k)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
