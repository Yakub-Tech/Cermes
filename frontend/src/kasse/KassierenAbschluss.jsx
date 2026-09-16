import { formatEuro } from '../api.js';
import { lesbareSchriftfarbe, dunklereFarbe } from '../komponenten/farbe.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

function nachArtikelGruppiert(kaertchenListe) {
  const gruppenProArtikel = new Map();
  for (const kaertchen of kaertchenListe) {
    const schluessel = kaertchen.artikel_name;
    if (!gruppenProArtikel.has(schluessel)) {
      gruppenProArtikel.set(schluessel, []);
    }
    gruppenProArtikel.get(schluessel).push(kaertchen);
  }
  const gruppiert = [];
  for (const gruppe of gruppenProArtikel.values()) {
    gruppe.sort((a, b) => a.nummer - b.nummer);
    gruppiert.push(...gruppe);
  }
  return gruppiert;
}

export default function KassierenAbschluss({ ergebnis, laeuft, fehler, onZurueck, onFertig, sprache }) {
  const kaertchenGruppiert = nachArtikelGruppiert(ergebnis.kaertchen);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-grund p-6">
      <h2 className="mb-4 text-center font-display text-3xl text-navy">
        Diese Kärtchen ausgeben
      </h2>

      <div className="flex flex-1 flex-wrap content-start items-start justify-center gap-4 overflow-y-auto">
        {kaertchenGruppiert.map((kaertchen, index) => {
          const schrift = lesbareSchriftfarbe(kaertchen.artikel_farbe);
          return (
            <div key={index}
              className="putz-textur w-52 rounded-[24px] border p-4 text-center shadow-[0_2px_5px_rgba(0,0,0,0.18)]"
              style={{
                backgroundColor: kaertchen.artikel_farbe,
                borderColor: dunklereFarbe(kaertchen.artikel_farbe),
                color: schrift,
              }}>
              <p className="nummer text-7xl">{kaertchen.nummer}</p>
              <p className="mt-1 text-xl font-semibold">
                {zweisprachigerName(kaertchen.artikel_name, kaertchen.artikel_name_tr, sprache)}
              </p>
              {kaertchen.beilagen.length > 0 && (
                <p className="mt-1 text-sm opacity-80">
                  {kaertchen.beilagen.map((name, i) => zweisprachigerName(name, kaertchen.beilagen_tr[i], sprache)).join(', ')}
                </p>
              )}
              {kaertchen.hinweis && (
                <p className="mt-2 rounded-lg bg-grund/90 px-2 py-1 text-sm font-semibold text-weinrot">
                  {kaertchen.hinweis}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {fehler && (
        <p className="mx-auto mb-2 max-w-2xl rounded bg-blau/30 px-3 py-2 text-center text-blau">
          {fehler}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl bg-flaeche px-6 py-4">
        <button onClick={onZurueck} disabled={laeuft}
          className="cursor-pointer rounded-full border border-linie px-8 py-4 text-xl font-bold text-navy hover:bg-flaeche-hell disabled:cursor-not-allowed disabled:opacity-40">
          Zurück
        </button>
        <span className="text-xl text-schrift-gedimmt">
          Zu zahlen: <span className="nummer text-3xl text-navy">{formatEuro(ergebnis.summe_cent)}</span>
        </span>
        <button onClick={onFertig} disabled={laeuft} autoFocus
          className="cursor-pointer rounded-full bg-blau px-12 py-4 text-2xl font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-40">
          Fertig
        </button>
      </div>
    </div>
  );
}
