import { formatEuro } from '../api.js';
import { lesbareSchriftfarbe, dunklereFarbe } from '../komponenten/farbe.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';
import { de, tr } from '../sprache/kassierenAbschluss.js';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import { KNOPF_NEBEN, KNOPF_HAUPT } from './knopfKlassen.js';

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

export default function KassierenAbschluss({ ergebnis, laeuft, fehler, zurueckGesperrt, onZurueck, onFertig, sprache }) {
  const texte = sprache === 'tr' ? tr : de;
  const kaertchenGruppiert = nachArtikelGruppiert(ergebnis.kaertchen);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-grund p-6">
      <h2 className="mb-4 text-center font-display text-3xl font-semibold tracking-tight text-schrift">
        {texte.titel}
      </h2>

      <div className="flex flex-1 flex-wrap content-start items-start justify-center gap-4 overflow-y-auto">
        {kaertchenGruppiert.map((kaertchen, index) => {
          const schrift = lesbareSchriftfarbe(kaertchen.artikel_farbe);
          return (
            <div key={index}
              className="putz-textur kaertchen-schatten w-52 rounded-[24px] border p-4 text-center"
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
                  {kaertchen.beilagen.map((name, i) => zweisprachigerName(name, (kaertchen.beilagen_tr ?? [])[i], sprache)).join(', ')}
                </p>
              )}
              {kaertchen.sonderwunsch && (
                <p className="mt-1 break-words rounded-lg bg-grund/90 px-2 py-1 text-sm font-semibold text-schrift">
                  {kaertchen.sonderwunsch}
                </p>
              )}
              {kaertchen.hinweis && (
                <p className="mt-2 rounded-lg bg-grund/90 px-2 py-1 text-sm font-semibold text-gefahr-schrift">
                  {kaertchen.hinweis}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {fehler && (
        <Hinweiskasten art="fehler" className="mx-auto mb-2 max-w-2xl text-center">
          {fehler}
        </Hinweiskasten>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl border border-linie bg-flaeche px-6 py-4">
        <button onClick={onZurueck} disabled={laeuft || zurueckGesperrt}
          className={`${KNOPF_NEBEN} px-8 py-4 text-xl font-bold text-schrift`}>
          {texte.zurueck}
        </button>
        <span className="text-xl text-schrift-gedimmt">
          {texte.zuZahlen} <span className="nummer text-3xl text-schrift">{formatEuro(ergebnis.summe_cent)}</span>
        </span>
        <button onClick={onFertig} disabled={laeuft} autoFocus
          className={`${KNOPF_HAUPT} px-12 py-4 text-2xl font-bold`}>
          {texte.fertig}
        </button>
      </div>
    </div>
  );
}
