import { formatEuro } from '../api.js';

export default function Warenkorb({ positionen, onEntfernen, onKassieren, laeuft, fehler }) {
  const summe = positionen.reduce((s, p) => s + p.artikel.preis_cent, 0);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-linie bg-flaeche">
      <h2 className="border-b border-linie px-4 py-3 font-display text-xl text-navy">Warenkorb</h2>

      <ul className="flex-1 overflow-y-auto">
        {positionen.length === 0 && (
          <li className="px-4 py-6 text-schrift-gedimmt">
            Noch leer, Artikel links antippen.
          </li>
        )}
        {positionen.map((position) => (
          <li key={position.schluessel}
            className="flex gap-3 border-b border-linie px-4 py-3">
            <span className="w-1.5 shrink-0 rounded"
              style={{ backgroundColor: position.artikel.farbe }} />
            <div className="min-w-0 flex-1 self-center">
              <p className="truncate text-lg">{position.artikel.name}</p>
              {position.beilagen.length > 0 && (
                <p className="text-sm text-schrift-gedimmt">
                  {position.beilagen.map((b) => b.name).join(', ')}
                </p>
              )}
            </div>
            <span className="nummer self-center text-lg">{formatEuro(position.artikel.preis_cent)}</span>
            <button onClick={() => onEntfernen(position.schluessel)}
              aria-label={`${position.artikel.name} entfernen`}
              className="cursor-pointer self-center rounded-lg border border-linie px-3 py-2 text-blau-hell hover:bg-flaeche-hell">
              ✕
            </button>
          </li>
        ))}
      </ul>

      {fehler && (
        <p className="mx-4 mb-2 rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>
      )}

      <div className="border-t border-linie p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-schrift-gedimmt">Gesamt</span>
          <span className="nummer text-4xl text-navy">{formatEuro(summe)}</span>
        </div>
        <button onClick={onKassieren} disabled={laeuft || positionen.length === 0}
          className="w-full cursor-pointer rounded-xl bg-blau py-5 text-2xl font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-40">
          {laeuft ? 'Wird gebucht …' : 'Kassieren'}
        </button>
      </div>
    </aside>
  );
}
