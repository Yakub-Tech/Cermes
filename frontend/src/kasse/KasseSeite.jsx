import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import Fusszeile from '../komponenten/Fusszeile.jsx';
import SprachSchalter from '../komponenten/SprachSchalter.jsx';
import Reiterleiste from '../komponenten/Reiterleiste.jsx';
import KundenanzeigeSchalter from './KundenanzeigeSchalter.jsx';
import { useSession } from '../anmeldung/useSession.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { apiGet, apiPost, apiPut } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import LadefehlerHinweis from '../komponenten/LadefehlerHinweis.jsx';
import { erzeugeMeldungsFolge } from './meldungsFolge.js';
import { buchungNachFehlerUnklar } from './buchungUnklar.js';
import { positionHinzufuegen as positionZumWarenkorbHinzufuegen, mengeAendern, positionenFuerApi } from './warenkorb.js';
import BeilagenDialog from './BeilagenDialog.jsx';
import Warenkorb from './Warenkorb.jsx';
import KassierenAbschluss from './KassierenAbschluss.jsx';
import StornoTab from './StornoTab.jsx';
import GeparkteDialog from './GeparkteDialog.jsx';
import ArtikelRaster from './ArtikelRaster.jsx';
import { useGeparkte } from './useGeparkte.js';
import WarenkorbVerlassenDialog from './WarenkorbVerlassenDialog.jsx';
import { de, tr } from '../sprache/kasse.js';
import { kassenNummerDiesesGeraets } from '../kassenNummer.js';
import { useKundenDesign } from '../design/useKundenDesign.js';

export default function KasseSeite() {
  const { neueste, ladefehler } = useNeuesteAntwort(laden);
  const session = useSession('kasse');
  const navigiere = useNavigate();
  const [suchParameter] = useSearchParams();
  const [kassenNummer] = useState(() => kassenNummerDiesesGeraets(suchParameter.get('kasse'), () => localStorage));
  const [tab, setTab] = useState('verkauf');
  const [artikelListe, setArtikelListe] = useState([]);
  const [positionen, setPositionen] = useState([]);
  const [beilagenArtikel, setBeilagenArtikel] = useState(null);
  const [fokusAuswahl, setFokusAuswahl] = useState([]);
  const [ergebnis, setErgebnis] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState('');
  const [warenkorbVerlassenAktiv, setWarenkorbVerlassenAktiv] = useState(false);
  const [sprache, setSprache] = useState('de');
  const texte = sprache === 'tr' ? tr : de;
  const [kundenDesign, setKundenDesign] = useKundenDesign();
  const naechsterSchluessel = useRef(1);
  const vorgangKennung = useRef(null);
  const [buchungUnklar, setBuchungUnklar] = useState(false);
  const kundenMelden = useRef(null);
  useEffect(() => {
    const folge = erzeugeMeldungsFolge(
      (stand) => apiPut('/api/kasse/kundenanzeige', { ...stand, kasse: kassenNummer })
    );
    kundenMelden.current = folge;
    return () => folge.beenden();
  }, [kassenNummer]);
  useLiveUpdate([], () => kundenMelden.current.erneutMelden());

  function logoGeklickt(ereignis) {
    if (positionen.length > 0) {
      ereignis.preventDefault();
      setWarenkorbVerlassenAktiv(true);
    }
  }

  function laden() {
    neueste('/api/kasse/artikel', apiGet('/api/kasse/artikel'), setArtikelListe).catch(() => {});
  }
  useLiveUpdate(['artikel', 'beilagen'], laden);

  function artikelTippen(artikel) {
    if (artikel.beilagen.length > 0) {
      setFokusAuswahl([]);
      setBeilagenArtikel(artikel);
    } else {
      positionHinzufuegen(artikel, []);
    }
  }

  function positionHinzufuegen(artikel, beilagen, sonderwunsch = '') {
    function naechsteNummer() {
      const nummer = naechsterSchluessel.current;
      naechsterSchluessel.current += 1;
      return nummer;
    }
    setPositionen((alte) => positionZumWarenkorbHinzufuegen(alte, artikel, beilagen, naechsteNummer, sonderwunsch));
    setBeilagenArtikel(null);
    setFokusAuswahl([]);
  }

  function sonderwunschOeffnen(artikel) {
    setFokusAuswahl([]);
    setBeilagenArtikel(artikel);
  }

  function ausverkauftUmschalten(artikel) {
    setFehler('');
    apiPut(`/api/artikel/${artikel.id}/ausverkauft`, { ausverkauft: artikel.ausverkauft ? 0 : 1 })
      .catch((f) => setFehler(f.message));
  }

  const parkplatz = useGeparkte({
    kassenNummer, sprache, positionen, setPositionen, artikelListe, meldeHinweis: setFehler,
    naechsterSchluessel: () => {
      const nummer = naechsterSchluessel.current;
      naechsterSchluessel.current += 1;
      return nummer;
    },
    vorParken: () => { setBeilagenArtikel(null); setFokusAuswahl([]); },
  });

  function positionMengeAendern(schluessel, delta) {
    setPositionen((alte) => mengeAendern(alte, schluessel, delta));
  }

  useEffect(() => {
    const fokus = beilagenArtikel && beilagenArtikel.beilagen.length > 0 ? {
      artikel_name: beilagenArtikel.name,
      artikel_name_tr: beilagenArtikel.name_tr,
      farbe: beilagenArtikel.farbe,
      bild_url: beilagenArtikel.bild_url ?? null,
      preis_cent: beilagenArtikel.preis_cent,
      beilagenOptionen: beilagenArtikel.beilagen.map((beilage) => ({
        name: beilage.name,
        name_tr: beilage.name_tr,
        aktiv: !!beilage.aktiv,
        ausgewaehlt: fokusAuswahl.some((g) => g.id === beilage.id),
      })),
    } : null;
    kundenMelden.current.melden({
      warenkorb: positionen.map((p) => ({
        schluessel: p.schluessel,
        artikel_name: p.artikel.name,
        artikel_name_tr: p.artikel.name_tr,
        farbe: p.artikel.farbe,
        preis_cent: p.artikel.preis_cent,
        beilagen: p.beilagen.map((b) => b.name),
        beilagen_tr: p.beilagen.map((b) => b.name_tr),
        menge: p.menge,
      })),
      fokus,
      summe_cent: ergebnis ? ergebnis.summe_cent : null,
      sprache,
      design: kundenDesign,
    });
  }, [positionen, beilagenArtikel, fokusAuswahl, ergebnis, sprache, kundenDesign]);

  async function kassierenVorschauAnzeigen() {
    setLaeuft(true);
    setFehler('');
    if (!vorgangKennung.current) {
      vorgangKennung.current = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
    try {
      const antwort = await apiPost('/api/kasse/kassieren-vorschau', { positionen: positionenFuerApi(positionen) });
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
        positionen: positionenFuerApi(positionen),
        erwartete_nummern: ergebnis.kaertchen.map((k) => k.nummer),
        erwartete_preise_cent: ergebnis.kaertchen.map((k) => k.preis_cent),
        vorgang_kennung: vorgangKennung.current,
      });
      vorgangKennung.current = null;
      setBuchungUnklar(false);
      setErgebnis(null);
      setPositionen([]);
    } catch (f) {
      const unklar = buchungNachFehlerUnklar(buchungUnklar, f);
      setBuchungUnklar(unklar);
      if (f.status === undefined) {
        setFehler(texte.buchungUnklar);
      } else {
        setFehler(f.message);
      }
    }
    setLaeuft(false);
  }

  if (session.laedt) return null;

  return (
    <div className="flex h-screen flex-col">
      <Kopfzeile titel={kassenNummer === 1 ? texte.titel : `${texte.titel} ${kassenNummer}`} benutzername={session.benutzername} aufLogoKlick={logoGeklickt}
        sprache={sprache}
        rechts={
          <>
            <SprachSchalter sprache={sprache} onWahl={setSprache} />
            <Reiterleiste reiter={[['verkauf', texte.verkauf], ['storno', texte.storno]]} aktiv={tab} onWahl={setTab}
              betont knopfKlasse="px-5 py-2 text-lg" />
            <KundenanzeigeSchalter design={kundenDesign} onWahl={setKundenDesign} sprache={sprache} texte={texte} />
          </>
        } />

      {ladefehler && (
        <div className="px-4 pt-2">
          <LadefehlerHinweis sprache={sprache} onErneut={laden} />
        </div>
      )}

      {tab === 'verkauf' ? (
        <div className="flex min-h-0 flex-1">
          <ArtikelRaster artikelListe={artikelListe} sprache={sprache} texte={texte} laeuft={laeuft}
            ladefehler={ladefehler}
            onTippen={artikelTippen} onSonderwunsch={sonderwunschOeffnen} onAusverkauft={ausverkauftUmschalten} />

          <Warenkorb positionen={positionen} laeuft={laeuft} fehler={fehler} sprache={sprache}
            onMengeAendern={positionMengeAendern}
            geparktAnzahl={parkplatz.geparkte.length}
            onParken={parkplatz.parken}
            onGeparkteOeffnen={() => { setFehler(''); parkplatz.setDialogOffen(true); }}
            onKassieren={kassierenVorschauAnzeigen} />
        </div>
      ) : (
        <StornoTab sprache={sprache} />
      )}

      <Fusszeile sprache={sprache} />

      {beilagenArtikel && (
        <BeilagenDialog artikel={beilagenArtikel} sprache={sprache}
          onBestaetigen={(beilagen, sonderwunsch) => positionHinzufuegen(beilagenArtikel, beilagen, sonderwunsch)}
          onAbbrechen={() => { setBeilagenArtikel(null); setFokusAuswahl([]); }}
          onAuswahlAendern={setFokusAuswahl} />
      )}

      {ergebnis && (
        <KassierenAbschluss ergebnis={ergebnis} laeuft={laeuft} fehler={fehler} sprache={sprache}
          zurueckGesperrt={buchungUnklar}
          onZurueck={() => {
            if (buchungUnklar) return;
            vorgangKennung.current = null;
            setErgebnis(null);
            setFehler('');
          }}
          onFertig={kassierenBuchen} />
      )}

      {parkplatz.dialogOffen && (
        <GeparkteDialog geparkte={parkplatz.geparkte} sprache={sprache}
          onZurueckholen={parkplatz.zurueckholen}
          onVerwerfen={parkplatz.verwerfen}
          onSchliessen={() => parkplatz.setDialogOffen(false)} />
      )}

      {warenkorbVerlassenAktiv && (
        <WarenkorbVerlassenDialog sprache={sprache}
          onZurueck={() => setWarenkorbVerlassenAktiv(false)}
          onVerlassen={() => navigiere('/')} />
      )}
    </div>
  );
}
