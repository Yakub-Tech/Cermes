import { useEffect, useState } from 'react';
import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import SprachSchalter from '../komponenten/SprachSchalter.jsx';
import { useStationsSprache } from '../sprache/useStationsSprache.js';
import Fusszeile from '../komponenten/Fusszeile.jsx';
import Snackbar from '../komponenten/Snackbar.jsx';
import KaertchenKarte from '../komponenten/KaertchenKarte.jsx';
import StationsSpalte from '../komponenten/StationsSpalte.jsx';
import { useSession } from '../anmeldung/useSession.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { apiGet, apiPost } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import LadefehlerHinweis from '../komponenten/LadefehlerHinweis.jsx';
import { minutenSeit, alterText } from '../zeitAnzeige.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/ausgabe.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function AusgabeSeite() {
  const { neueste, ladefehler } = useNeuesteAntwort(laden);
  const session = useSession('ausgabe');
  const [sprache, setSprache] = useStationsSprache();
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [listen, setListen] = useState({ abholbereit: [], zuletzt_abgeholt: [] });
  const [warnminuten, setWarnminuten] = useState(15);
  const [snackbar, setSnackbar] = useState(null);
  const [aktionsfehler, setAktionsfehler] = useState('');
  const [jetzt, setJetzt] = useState(Date.now());

  function listeLaden() {
    neueste('/api/ausgabe/kaertchen', apiGet('/api/ausgabe/kaertchen'), setListen).catch(() => {});
  }
  function einstellungenLaden() {
    neueste('/api/einstellungen', apiGet('/api/einstellungen'),
      (e) => setWarnminuten(e.abholbereit_warnminuten)).catch(() => {});
  }
  function laden() {
    listeLaden();
    einstellungenLaden();
  }
  useLiveUpdate(['kaertchen'], listeLaden);
  useLiveUpdate(['einstellungen'], einstellungenLaden);

  useEffect(() => {
    const timer = setInterval(() => setJetzt(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  function aktionAbgelehnt(fehler) {
    setAktionsfehler(fehler.message);
    laden();
  }

  async function statusWechsel(kaertchen, neuerStatus, rueckStatus, meldung) {
    setAktionsfehler('');
    try {
      await apiPost(`/api/ausgabe/status/${kaertchen.id}`, { status: neuerStatus });
      setSnackbar({
        meldung: `${texte.nrPraefix} ${kaertchen.nummer} ${meldung}`,
        rueckgaengig: () =>
          apiPost(`/api/ausgabe/status/${kaertchen.id}`, { status: rueckStatus }).catch(aktionAbgelehnt),
      });
    } catch (f) {
      aktionAbgelehnt(f);
    }
  }

  if (session.laedt) return null;

  const spalten = [
    {
      id: 'abholbereit',
      betont: true,
      kaertchen: listen.abholbereit,
      karte: (k) => {
        const wartet = minutenSeit(k.abholbereit_am, jetzt);
        const wartetSeitPraefix = texte.wartetSeitVorspann ? `${texte.wartetSeitVorspann} ` : '';
        return (
          <KaertchenKarte key={k.id} kaertchen={k} sprache={sprache}
            zeitText={wartet >= warnminuten
              ? `${wartetSeitPraefix}${wartet} ${texte.wartetSeitNachspann}`
              : alterText(k.abholbereit_am, jetzt, sprache)}
            warnung={wartet >= warnminuten}
            onTippen={() => statusWechsel(k, 'abgeholt', 'abholbereit', texte.meldungAbgeholt)} />
        );
      },
    },
    {
      id: 'zuletztAbgeholt',
      betont: false,
      kaertchen: listen.zuletzt_abgeholt,
      karte: (k) => (
        <div key={k.id} className="flex items-center gap-2">
          <div className="flex-1 opacity-60">
            <KaertchenKarte kaertchen={k} zeitText={alterText(k.abgeholt_am, jetzt, sprache)} sprache={sprache} />
          </div>
          <button
            onClick={() => apiPost(`/api/ausgabe/status/${k.id}`, { status: 'abholbereit' }).catch(aktionAbgelehnt)}
            className="cursor-pointer rounded-lg border border-schrift-gedimmt/35 px-3 py-6 text-schrift-gedimmt hover:bg-flaeche-hell">
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

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 bg-grund p-3">
        {spalten.map((spalte) => (
          <StationsSpalte key={spalte.id} titel={texte[spalte.id]} anzahl={spalte.kaertchen.length}
            betont={spalte.betont}>
            {spalte.kaertchen.map(spalte.karte)}
          </StationsSpalte>
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
