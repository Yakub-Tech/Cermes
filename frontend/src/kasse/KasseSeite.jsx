import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import Fusszeile from '../komponenten/Fusszeile.jsx';
import { useSession } from '../anmeldung/useSession.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { apiGet, apiPost, apiPut, formatEuro } from '../api.js';
import { erzeugeMeldungsFolge } from './meldungsFolge.js';
import BeilagenDialog from './BeilagenDialog.jsx';
import Warenkorb from './Warenkorb.jsx';
import KassierenAbschluss from './KassierenAbschluss.jsx';
import StornoTab from './StornoTab.jsx';
import WarenkorbVerlassenDialog from './WarenkorbVerlassenDialog.jsx';

export default function KasseSeite() {
  const session = useSession('kasse');
  const navigiere = useNavigate();
  const [tab, setTab] = useState('verkauf');
  const [artikelListe, setArtikelListe] = useState([]);
  const [positionen, setPositionen] = useState([]);
  const [beilagenArtikel, setBeilagenArtikel] = useState(null);
  const [fokusAuswahl, setFokusAuswahl] = useState([]);
  const [ergebnis, setErgebnis] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState('');
  const [warenkorbVerlassenAktiv, setWarenkorbVerlassenAktiv] = useState(false);
  const naechsterSchluessel = useRef(1);
  const kundenMelden = useRef(erzeugeMeldungsFolge(
    (stand) => apiPut('/api/kasse/kundenanzeige', stand)
  ));

  function logoGeklickt(ereignis) {
    if (positionen.length > 0) {
      ereignis.preventDefault();
      setWarenkorbVerlassenAktiv(true);
    }
  }

  useLiveUpdate(['artikel', 'beilagen'], () => {
    apiGet('/api/kasse/artikel').then(setArtikelListe).catch(() => {});
  });

  function artikelTippen(artikel) {
    if (artikel.beilagen.length > 0) {
      setFokusAuswahl([]);
      setBeilagenArtikel(artikel);
    } else {
      positionHinzufuegen(artikel, []);
    }
  }

  function positionHinzufuegen(artikel, beilagen) {
    const schluessel = naechsterSchluessel.current;
    naechsterSchluessel.current += 1;
    setPositionen((alte) => [...alte, { schluessel, artikel, beilagen }]);
    setBeilagenArtikel(null);
    setFokusAuswahl([]);
  }

  useEffect(() => {
    const fokus = beilagenArtikel ? {
      artikel_name: beilagenArtikel.name,
      farbe: beilagenArtikel.farbe,
      bild_url: beilagenArtikel.bild_url ?? null,
      preis_cent: beilagenArtikel.preis_cent,
      beilagenOptionen: beilagenArtikel.beilagen.map((beilage) => ({
        name: beilage.name,
        aktiv: !!beilage.aktiv,
        ausgewaehlt: fokusAuswahl.some((g) => g.id === beilage.id),
      })),
    } : null;
    kundenMelden.current({
      warenkorb: positionen.map((p) => ({
        schluessel: p.schluessel,
        artikel_name: p.artikel.name,
        farbe: p.artikel.farbe,
        preis_cent: p.artikel.preis_cent,
        beilagen: p.beilagen.map((b) => b.name),
      })),
      fokus,
    });
  }, [positionen, beilagenArtikel, fokusAuswahl]);

  function positionenFuerApi() {
    return positionen.map((p) => ({
      artikel_id: p.artikel.id,
      beilagen_ids: p.beilagen.map((b) => b.id),
    }));
  }

  async function kassierenVorschauAnzeigen() {
    setLaeuft(true);
    setFehler('');
    try {
      const antwort = await apiPost('/api/kasse/kassieren-vorschau', { positionen: positionenFuerApi() });
      setErgebnis(antwort);
    } catch (f) {
      setFehler(f.message);
    }
    setLaeuft(false);
  }

  async function kassierenBuchen() {
    setLaeuft(true);
    setFehler('');
    try {
      await apiPost('/api/kasse/kassieren', {
        positionen: positionenFuerApi(),
        erwartete_nummern: ergebnis.kaertchen.map((k) => k.nummer),
        erwartete_preise_cent: ergebnis.kaertchen.map((k) => k.preis_cent),
      });
      setErgebnis(null);
      setPositionen([]);
    } catch (f) {
      setFehler(f.message);
    }
    setLaeuft(false);
  }

  if (session.laedt) return null;

  return (
    <div className="flex h-screen flex-col">
      <Kopfzeile titel="Kasse" benutzername={session.benutzername} aufLogoKlick={logoGeklickt}
        rechts={
          <nav className="flex gap-1 rounded-full border border-linie p-1">
            {[['verkauf', 'Verkauf'], ['storno', 'Storno']].map(([wert, beschriftung]) => (
              <button key={wert} onClick={() => setTab(wert)}
                className={`cursor-pointer rounded-full px-5 py-2 text-lg ${
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
                className="putz-textur-hell kaertchen-schatten-vertieft min-h-32 cursor-pointer rounded-[24px] border border-linie bg-flaeche p-4 text-left hover:bg-flaeche-hell active:scale-[0.98]"
                style={{ borderTop: `6px solid ${artikel.farbe}` }}>
                <p className="break-words text-2xl font-semibold">{artikel.name}</p>
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
            onKassieren={kassierenVorschauAnzeigen} />
        </div>
      ) : (
        <StornoTab />
      )}

      <Fusszeile />

      {beilagenArtikel && (
        <BeilagenDialog artikel={beilagenArtikel}
          onBestaetigen={(beilagen) => positionHinzufuegen(beilagenArtikel, beilagen)}
          onAbbrechen={() => { setBeilagenArtikel(null); setFokusAuswahl([]); }}
          onAuswahlAendern={setFokusAuswahl} />
      )}

      {ergebnis && (
        <KassierenAbschluss ergebnis={ergebnis} laeuft={laeuft} fehler={fehler}
          onZurueck={() => { setErgebnis(null); setFehler(''); }}
          onFertig={kassierenBuchen} />
      )}

      {warenkorbVerlassenAktiv && (
        <WarenkorbVerlassenDialog
          onZurueck={() => setWarenkorbVerlassenAktiv(false)}
          onVerlassen={() => navigiere('/')} />
      )}
    </div>
  );
}
