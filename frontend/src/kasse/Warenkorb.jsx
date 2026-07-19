import { formatEuro } from '../api.js';

export default function Warenkorb({ positionen, onEntfernen, onKassieren, laeuft, fehler }) {
  const summe = positionen.reduce((s, p) => s + p.artikel.preis_cent, 0);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-linie bg-flaeche">
      <h2 className="border-b border-linie px-4 py-3 font-display text-xl text-gold">Warenkorb</h2>

      <ul className="flex-1 overflow-y-auto">
        {positionen.length === 0 && (
          <li className="px-4 py-6 text-schrift-gedimmt">
            Noch leer, Artikel links antippen.
          </li>
        )}
        {positionen.map((position) => (
          <li key={position.schluessel}
            className="flex items-center gap-3 border-b border-linie px-4 py-3">
            <span className="h-10 w-1.5 rounded"
              style={{ backgroundColor: position.artikel.farbe }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg">{position.artikel.name}</p>
              {position.beilagen.length > 0 && (
                <p className="truncate text-sm text-schrift-gedimmt">
                  {position.beilagen.map((b) => b.name).join(', ')}
                </p>
              )}
            </div>
            <span className="nummer text-lg">{formatEuro(position.artikel.preis_cent)}</span>
            <button onClick={() => onEntfernen(position.schluessel)}
              aria-label={`${position.artikel.name} entfernen`}
              className="rounded-lg border border-linie px-3 py-2 text-rot-hell hover:bg-flaeche-hell">
              ✕
            </button>
          </li>
        ))}
      </ul>

      {fehler && (
        <p className="mx-4 mb-2 rounded bg-rot/30 px-3 py-2 text-rot-hell">{fehler}</p>
      )}

      <div className="border-t border-linie p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-schrift-gedimmt">Gesamt</span>
          <span className="nummer text-4xl text-gold">{formatEuro(summe)}</span>
        </div>
        <button onClick={onKassieren} disabled={laeuft || positionen.length === 0}
          className="w-full rounded-xl bg-rot py-5 text-2xl font-bold hover:bg-rot-hell disabled:opacity-40">
          {laeuft ? 'Wird gebucht …' : 'Kassieren'}
        </button>
      </div>
    </aside>
  );
}
