import { formatEuro } from '../api.js';
import { lesbareSchriftfarbe } from '../komponenten/farbe.js';

export default function NummernBestaetigung({ ergebnis, onFertig }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-grund p-6">
      <h2 className="mb-4 text-center font-display text-3xl text-navy">
        Diese Kärtchen ausgeben
      </h2>

      <div className="flex flex-1 flex-wrap content-start items-start justify-center gap-4 overflow-y-auto">
        {ergebnis.kaertchen.map((kaertchen) => {
          const schrift = lesbareSchriftfarbe(kaertchen.artikel_farbe);
          return (
            <div key={kaertchen.id}
              className="relative w-52 rounded-2xl p-4 pt-7 text-center shadow-xl"
              style={{ backgroundColor: kaertchen.artikel_farbe, color: schrift }}>
              <span className="stanzung absolute left-1/2 top-2.5 -translate-x-1/2" />
              <p className="nummer text-7xl">{kaertchen.nummer}</p>
              <p className="mt-1 text-xl font-semibold">{kaertchen.artikel_name}</p>
              {kaertchen.beilagen.length > 0 && (
                <p className="mt-1 text-sm opacity-80">{kaertchen.beilagen.join(', ')}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-flaeche px-6 py-4">
        <span className="text-xl text-schrift-gedimmt">
          Zu zahlen: <span className="nummer text-3xl text-navy">{formatEuro(ergebnis.summe_cent)}</span>
        </span>
        <button onClick={onFertig} autoFocus
          className="cursor-pointer rounded-xl bg-blau px-12 py-4 text-2xl font-bold text-flaeche hover:bg-blau-hell">
          Fertig
        </button>
      </div>
    </div>
  );
}
