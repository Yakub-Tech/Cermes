import { formatEuro } from '../api.js';

export default function WarenkorbListe({ warenkorb }) {
  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-linie bg-flaeche">
      <h2 className="border-b border-linie px-4 py-3 font-display text-xl text-navy">Deine Bestellung</h2>

      <ul className="flex-1 overflow-y-auto">
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
    </aside>
  );
}
