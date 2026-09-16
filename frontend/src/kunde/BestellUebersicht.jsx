import { formatEuro } from '../api.js';
import { useUeberlaufErkennung } from '../komponenten/useUeberlaufErkennung.js';
import { usePendelScroll } from '../komponenten/usePendelScroll.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

export default function BestellUebersicht({ warenkorb, summeCent, sprache }) {
  const { rahmen, inhalt, ueberlauf, ueberlaufPx } = useUeberlaufErkennung(warenkorb);
  const { versatzPx, uebergangSekunden } = usePendelScroll(ueberlaufPx);

  return (
    <div className="flex h-screen flex-col items-center bg-grund px-6 py-10">
      <h1 className="mb-6 text-center font-display text-4xl text-navy">Deine Bestellung</h1>

      <div className="min-h-0 w-full max-w-3xl flex-1">
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
            {warenkorb.map((position) => (
              <li key={position.schluessel} className="flex gap-4 border-b border-linie px-2 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-2xl">
                    {position.menge > 1 ? `${position.menge}× ` : ''}
                    {zweisprachigerName(position.artikel_name, position.artikel_name_tr, sprache)}
                  </p>
                  {position.beilagen.length > 0 && (
                    <p className="text-lg text-schrift-gedimmt">
                      {position.beilagen.map((name, i) => zweisprachigerName(name, (position.beilagen_tr ?? [])[i], sprache)).join(', ')}
                    </p>
                  )}
                </div>
                <span className="nummer self-center text-2xl">
                  {formatEuro(position.preis_cent * position.menge)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex w-full max-w-3xl items-baseline justify-between rounded-xl bg-flaeche px-6 py-5">
        <span className="text-2xl text-schrift-gedimmt">Gesamtsumme</span>
        <span className="nummer text-5xl text-navy">{formatEuro(summeCent)}</span>
      </div>
    </div>
  );
}
