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
import { minutenSeit, alterText } from '../zeitAnzeige.js';

export default function AusgabeSeite() {
  const session = useSession('ausgabe');
  const [sprache, setSprache] = useStationsSprache();
  const [listen, setListen] = useState({ abholbereit: [], zuletzt_abgeholt: [] });
  const [warnminuten, setWarnminuten] = useState(15);
  const [snackbar, setSnackbar] = useState(null);
  const [jetzt, setJetzt] = useState(Date.now());

  useLiveUpdate(['kaertchen', 'einstellungen'], () => {
    apiGet('/api/ausgabe/kaertchen').then(setListen).catch(() => {});
    apiGet('/api/einstellungen')
      .then((e) => setWarnminuten(e.abholbereit_warnminuten)).catch(() => {});
  });

  useEffect(() => {
    const timer = setInterval(() => setJetzt(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  async function statusWechsel(kaertchen, neuerStatus, rueckStatus, meldung) {
    try {
      await apiPost(`/api/ausgabe/status/${kaertchen.id}`, { status: neuerStatus });
      setSnackbar({
        meldung: `Nr. ${kaertchen.nummer} ${meldung}`,
        rueckgaengig: () =>
          apiPost(`/api/ausgabe/status/${kaertchen.id}`, { status: rueckStatus }).catch(() => {}),
      });
    } catch {
    }
  }

  if (session.laedt) return null;

  const spalten = [
    {
      titel: 'Abholbereit',
      kopfstil: 'stark',
      kaertchen: listen.abholbereit,
      karte: (k) => {
        const wartet = minutenSeit(k.abholbereit_am, jetzt);
        return (
          <KaertchenKarte key={k.id} kaertchen={k} sprache={sprache}
            zeitText={wartet >= warnminuten ? `wartet seit ${wartet} min!` : alterText(k.abholbereit_am, jetzt)}
            warnung={wartet >= warnminuten}
            onTippen={() => statusWechsel(k, 'abgeholt', 'abholbereit', 'wurde abgeholt')} />
        );
      },
    },
    {
      titel: 'Zuletzt abgeholt',
      kopfstil: 'blass',
      kaertchen: listen.zuletzt_abgeholt,
      karte: (k) => (
        <div key={k.id} className="flex items-center gap-2">
          <div className="flex-1 opacity-60">
            <KaertchenKarte kaertchen={k} zeitText={alterText(k.abgeholt_am, jetzt)} sprache={sprache} />
          </div>
          <button
            onClick={() => apiPost(`/api/ausgabe/status/${k.id}`, { status: 'abholbereit' }).catch(() => {})}
            className="cursor-pointer rounded-lg border border-linie px-3 py-6 text-schrift-gedimmt hover:bg-flaeche-hell">
            Rückgängig
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-screen flex-col">
      <Kopfzeile titel="Ausgabe" benutzername={session.benutzername} sprache={sprache}
        rechts={<SprachSchalter sprache={sprache} onWahl={setSprache} />} />

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 bg-grund p-3">
        {spalten.map((spalte) => (
          <section key={spalte.titel}
            className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-flaeche shadow-sm">
            <h2 className={`px-4 py-3 text-center font-display text-xl ${
              spalte.kopfstil === 'stark' ? 'bg-blau text-flaeche' : 'bg-blau-blass text-navy'
            }`}>
              {spalte.titel} ({spalte.kaertchen.length})
            </h2>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 pt-2 pb-4">
              {spalte.kaertchen.map(spalte.karte)}
            </div>
          </section>
        ))}
      </div>

      <Fusszeile />

      {snackbar && (
        <Snackbar meldung={snackbar.meldung} onRueckgaengig={snackbar.rueckgaengig}
          onZu={() => setSnackbar(null)} />
      )}
    </div>
  );
}
