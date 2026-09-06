import { sortiereFuerFluss } from './gruppierung.js';
import { useUeberlaufErkennung } from '../komponenten/useUeberlaufErkennung.js';
import { usePendelScroll } from '../komponenten/usePendelScroll.js';
import TvKarte from './TvKarte.jsx';

const MINDESTBREITE_PX = 130;

export default function StatusSpalte({ titel, titelTuerkisch, kaertchen }) {
  const flussKaertchen = sortiereFuerFluss(kaertchen);
  const { rahmen, inhalt, ueberlauf, ueberlaufPx } = useUeberlaufErkennung(kaertchen);
  const { versatzPx, uebergangSekunden } = usePendelScroll(ueberlaufPx);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 rounded-t-lg bg-blau py-4 text-center font-display text-4xl text-flaeche">
        <h2 className="sprachwechsel sprachwechsel-de">{titel}</h2>
        <h2 className="sprachwechsel sprachwechsel-tr">{titelTuerkisch}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-b-lg bg-flaeche p-3 shadow-sm">
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
              <TvKarte key={`${k.nummer}-${k.artikel_name}`} kaertchen={k} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
