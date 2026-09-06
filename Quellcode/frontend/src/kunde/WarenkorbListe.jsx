import { formatEuro } from '../api.js';
import { useUeberlaufErkennung } from '../komponenten/useUeberlaufErkennung.js';
import { usePendelScroll } from '../komponenten/usePendelScroll.js';

export default function WarenkorbListe({ warenkorb }) {
  const { rahmen, inhalt, ueberlauf, ueberlaufPx } = useUeberlaufErkennung(warenkorb);
  const { versatzPx, uebergangSekunden } = usePendelScroll(ueberlaufPx);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-linie bg-flaeche">
      <h2 className="border-b border-linie px-4 py-3 font-display text-xl text-navy">Deine Bestellung</h2>

      <div className="min-h-0 flex-1">
        <div
          ref={rahmen}
          className={`h-full overflow-hidden ${ueberlauf ? 'verlauf-rand' : ''}`}
        >
          <ul
            ref={inhalt}
            style={{
              transform: `translateY(-${versatzPx}px)`,
              transition: `transform ${uebergangSekunden}s linear`,
            }}
          >
            {warenkorb.length === 0 && (
              <li className="px-4 py-6 text-schrift-gedimmt">Noch nichts ausgewählt.</li>
            )}
            {warenkorb.map((position) => (
              <li key={position.schluessel} className="flex gap-3 border-b border-linie px-4 py-3">
                <div className="min-w-0 flex-1 self-center">
                  <p className="truncate text-lg">
                    {position.menge > 1 ? `${position.menge}× ` : ''}{position.artikel_name}
                  </p>
                  {position.beilagen.length > 0 && (
                    <p className="text-sm text-schrift-gedimmt">{position.beilagen.join(', ')}</p>
                  )}
                </div>
                <span className="nummer self-center text-sm">
                  {formatEuro(position.preis_cent * position.menge)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
