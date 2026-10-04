import { formatEuro } from '../api.js';
import { useUeberlaufErkennung } from '../komponenten/useUeberlaufErkennung.js';
import { usePendelScroll } from '../komponenten/usePendelScroll.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/warenkorbListe.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function WarenkorbListe({ warenkorb, sprache }) {
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const { rahmen, inhalt, ueberlauf, ueberlaufPx } = useUeberlaufErkennung(warenkorb);
  const { versatzPx, uebergangSekunden } = usePendelScroll(ueberlaufPx);

  return (
    <aside className="flex w-96 shrink-0 flex-col pb-6 border-l border-linie bg-flaeche">
      <h2 className="border-b border-linie px-4 py-3 font-display text-xl font-semibold text-schrift">{texte.deineBestellung}</h2>

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
              <li className="px-4 py-6 text-schrift-gedimmt">{texte.leer}</li>
            )}
            {warenkorb.map((position) => (
              <li key={position.schluessel} className="flex gap-3 border-b border-linie px-4 py-3">
                <div className="min-w-0 flex-1 self-center">
                  <p className="truncate text-lg">
                    {position.menge > 1 ? `${position.menge}× ` : ''}
                    {zweisprachigerName(position.artikel_name, position.artikel_name_tr, sprache)}
                  </p>
                  {position.beilagen.length > 0 && (
                    <p className="text-sm text-schrift-gedimmt">
                      {position.beilagen.map((name, i) => zweisprachigerName(name, (position.beilagen_tr ?? [])[i], sprache)).join(', ')}
                    </p>
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
