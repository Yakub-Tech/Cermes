import { useState } from 'react';
import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import { useSession } from '../anmeldung/useSession.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { apiGet, apiPost, formatEuro } from '../api.js';
import BeilagenDialog from './BeilagenDialog.jsx';
import Warenkorb from './Warenkorb.jsx';
import NummernBestaetigung from './NummernBestaetigung.jsx';
import StornoTab from './StornoTab.jsx';

export default function KasseSeite() {
  const session = useSession('kasse');
  const [tab, setTab] = useState('verkauf');
  const [artikelListe, setArtikelListe] = useState([]);
  const [positionen, setPositionen] = useState([]);
  const [beilagenArtikel, setBeilagenArtikel] = useState(null);
  const [ergebnis, setErgebnis] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState('');

  useLiveUpdate(['artikel', 'beilagen'], () => {
    apiGet('/api/kasse/artikel').then(setArtikelListe).catch(() => {});
  });

  function artikelTippen(artikel) {
    if (artikel.beilagen.length > 0) {
      setBeilagenArtikel(artikel);
    } else {
      positionHinzufuegen(artikel, []);
    }
  }

  function positionHinzufuegen(artikel, beilagen) {
    setPositionen((alte) => [...alte, { schluessel: crypto.randomUUID(), artikel, beilagen }]);
    setBeilagenArtikel(null);
  }

  async function kassieren() {
    setLaeuft(true);
    setFehler('');
    try {
      const antwort = await apiPost('/api/kasse/kassieren', {
        positionen: positionen.map((p) => ({
          artikel_id: p.artikel.id,
          beilagen_ids: p.beilagen.map((b) => b.id),
        })),
      });
      setErgebnis(antwort);
    } catch (f) {
      setFehler(f.message);
    }
    setLaeuft(false);
  }

  if (session.laedt) return null;

  return (
    <div className="flex h-screen flex-col">
      <Kopfzeile titel="Kasse" benutzername={session.benutzername}
        rechts={
          <nav className="flex gap-1 rounded-lg border border-linie p-1">
            {[['verkauf', 'Verkauf'], ['storno', 'Storno']].map(([wert, beschriftung]) => (
              <button key={wert} onClick={() => setTab(wert)}
                className={`cursor-pointer rounded-md px-5 py-2 text-lg ${
                  tab === wert ? 'bg-blau font-bold text-flaeche' : 'text-schrift-gedimmt hover:bg-flaeche-hell'
                }`}>
                {beschriftung}
              </button>
            ))}
          </nav>
        } />

      {tab === 'verkauf' ? (
        <div className="flex min-h-0 flex-1">
          <div className="grid flex-1 auto-rows-min grid-cols-2 gap-4 overflow-y-auto p-4 md:grid-cols-3 xl:grid-cols-4">
            {artikelListe.map((artikel) => (
              <button key={artikel.id} onClick={() => artikelTippen(artikel)}
                className="relative min-h-32 cursor-pointer rounded-xl border border-linie bg-flaeche p-4 text-left shadow-lg hover:bg-flaeche-hell active:scale-[0.98]"
                style={{ borderTop: `6px solid ${artikel.farbe}` }}>
                <p className="text-2xl font-semibold">{artikel.name}</p>
                <p className="nummer mt-2 text-xl text-navy">{formatEuro(artikel.preis_cent)}</p>
                {artikel.beilagen.length > 0 && (
                  <p className="mt-1 text-sm text-schrift-gedimmt">mit Beilagen-Auswahl</p>
                )}
              </button>
            ))}
            {artikelListe.length === 0 && (
              <p className="col-span-full p-4 text-schrift-gedimmt">
                Keine Artikel verfügbar. Artikel werden in der Verwaltung angelegt.
              </p>
            )}
          </div>

          <Warenkorb positionen={positionen} laeuft={laeuft} fehler={fehler}
            onEntfernen={(schluessel) =>
              setPositionen(positionen.filter((p) => p.schluessel !== schluessel))}
            onKassieren={kassieren} />
        </div>
      ) : (
        <StornoTab />
      )}

      {beilagenArtikel && (
        <BeilagenDialog artikel={beilagenArtikel}
          onBestaetigen={(beilagen) => positionHinzufuegen(beilagenArtikel, beilagen)}
          onAbbrechen={() => setBeilagenArtikel(null)} />
      )}

      {ergebnis && (
        <NummernBestaetigung ergebnis={ergebnis}
          onFertig={() => { setErgebnis(null); setPositionen([]); setFehler(''); }} />
      )}
    </div>
  );
}
