import { useEffect, useState } from 'react';
import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import SprachSchalter from '../komponenten/SprachSchalter.jsx';
import { useStationsSprache } from '../sprache/useStationsSprache.js';
import Fusszeile from '../komponenten/Fusszeile.jsx';
import Snackbar from '../komponenten/Snackbar.jsx';
import KaertchenKarte from '../komponenten/KaertchenKarte.jsx';
import { useSession } from '../anmeldung/useSession.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { apiGet, apiPost } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import LadefehlerHinweis from '../komponenten/LadefehlerHinweis.jsx';
import { alterText } from '../zeitAnzeige.js';
import StornoHinweis from './StornoHinweis.jsx';
import OffeneMengenLeiste from './OffeneMengenLeiste.jsx';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/belegen.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function BelegenSeite() {
  const { neueste, ladefehler } = useNeuesteAntwort(laden);
  const session = useSession('belegen');
  const [sprache, setSprache] = useStationsSprache();
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [listen, setListen] = useState({ in_bearbeitung: [], abholbereit: [], storniert: [] });
  const [snackbar, setSnackbar] = useState(null);
  const [aktionsfehler, setAktionsfehler] = useState('');
  const [jetzt, setJetzt] = useState(Date.now());

  function laden() {
    neueste('/api/belegen/kaertchen', apiGet('/api/belegen/kaertchen'), setListen).catch(() => {});
  }
  useLiveUpdate(['kaertchen'], laden);

  useEffect(() => {
    const timer = setInterval(() => setJetzt(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  function aktionAbgelehnt(fehler) {
    setAktionsfehler(fehler.message);
    laden();
  }

  function stornoVerstanden(kaertchen) {
    apiPost(`/api/belegen/storno-quittieren/${kaertchen.id}`).then(laden).catch(aktionAbgelehnt);
  }

  async function statusWechsel(kaertchen, neuerStatus, rueckStatus, meldung) {
    setAktionsfehler('');
    try {
      await apiPost(`/api/belegen/status/${kaertchen.id}`, { status: neuerStatus });
      setSnackbar({
        meldung: `${texte.nrPraefix} ${kaertchen.nummer} ${meldung}`,
        rueckgaengig: () =>
          apiPost(`/api/belegen/status/${kaertchen.id}`, { status: rueckStatus }).catch(aktionAbgelehnt),
      });
    } catch (f) {
      aktionAbgelehnt(f);
    }
  }

  if (session.laedt) return null;

  const spalten = [
    {
      id: 'inBearbeitung',
      kopfstil: 'stark',
      kaertchen: listen.in_bearbeitung,
      karte: (k) => (
        <KaertchenKarte key={k.id} kaertchen={k} zeitText={alterText(k.erstellt_am, jetzt, sprache)} sprache={sprache}
          onTippen={() => statusWechsel(k, 'abholbereit', 'in_bearbeitung', texte.meldungAbholbereit)} />
      ),
    },
    {
      id: 'abholbereit',
      kopfstil: 'blass',
      kaertchen: listen.abholbereit,
      karte: (k) => (
        <div key={k.id} className="flex items-center gap-2">
          <div className="flex-1">
            <KaertchenKarte kaertchen={k} zeitText={alterText(k.abholbereit_am, jetzt, sprache)} sprache={sprache} />
          </div>
          <button
            onClick={() => statusWechsel(k, 'in_bearbeitung', 'abholbereit', texte.meldungZurueckInBearbeitung)}
            className="kaertchen-schatten cursor-pointer rounded-lg border border-linie px-3 py-6 text-schrift-gedimmt hover:bg-flaeche-hell">
            {texte.rueckgaengig}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-screen flex-col">
      <Kopfzeile titel={texte.titel} benutzername={session.benutzername} sprache={sprache}
        rechts={<SprachSchalter sprache={sprache} onWahl={setSprache} />} />

      {(ladefehler || aktionsfehler) && (
        <div className="bg-grund px-3 pt-3">
          <LadefehlerHinweis sprache={sprache} aktionsfehler={aktionsfehler}
            onErneut={() => { setAktionsfehler(''); laden(); }} />
        </div>
      )}

      <StornoHinweis kaertchen={listen.storniert} sprache={sprache} texte={texte} onVerstanden={stornoVerstanden} />

      <OffeneMengenLeiste kaertchen={listen.in_bearbeitung} sprache={sprache} texte={texte} />

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 bg-grund p-3">
        {spalten.map((spalte) => (
          <section key={spalte.id}
            className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-flaeche shadow-sm">
            <h2 className={`px-4 py-3 text-center font-display text-xl ${
              spalte.kopfstil === 'stark' ? 'bg-blau text-flaeche' : 'bg-blau-blass text-navy'
            }`}>
              {texte[spalte.id]} ({spalte.kaertchen.length})
            </h2>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 pt-2 pb-4">
              {spalte.kaertchen.map(spalte.karte)}
            </div>
          </section>
        ))}
      </div>

      <Fusszeile sprache={sprache} />

      {snackbar && (
        <Snackbar meldung={snackbar.meldung} onRueckgaengig={snackbar.rueckgaengig}
          onZu={() => setSnackbar(null)} sprache={sprache} />
      )}
    </div>
  );
}
