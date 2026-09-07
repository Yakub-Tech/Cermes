import { useEffect, useState } from 'react';
import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import Fusszeile from '../komponenten/Fusszeile.jsx';
import Snackbar from '../komponenten/Snackbar.jsx';
import KaertchenKarte from '../komponenten/KaertchenKarte.jsx';
import { useSession } from '../anmeldung/useSession.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { apiGet, apiPost } from '../api.js';
import { alterText } from '../zeitAnzeige.js';

export default function BelegenSeite() {
  const session = useSession('belegen');
  const [listen, setListen] = useState({ in_bearbeitung: [], abholbereit: [] });
  const [snackbar, setSnackbar] = useState(null);
  const [jetzt, setJetzt] = useState(Date.now());

  useLiveUpdate(['kaertchen'], () => {
    apiGet('/api/belegen/kaertchen').then(setListen).catch(() => {});
  });

  useEffect(() => {
    const timer = setInterval(() => setJetzt(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  async function statusWechsel(kaertchen, neuerStatus, rueckStatus, meldung) {
    try {
      await apiPost(`/api/belegen/status/${kaertchen.id}`, { status: neuerStatus });
      setSnackbar({
        meldung: `Nr. ${kaertchen.nummer} ${meldung}`,
        rueckgaengig: () =>
          apiPost(`/api/belegen/status/${kaertchen.id}`, { status: rueckStatus }).catch(() => {}),
      });
    } catch {
    }
  }

  if (session.laedt) return null;

  const spalten = [
    {
      titel: 'In Bearbeitung',
      kopfstil: 'stark',
      kaertchen: listen.in_bearbeitung,
      karte: (k) => (
        <KaertchenKarte key={k.id} kaertchen={k} zeitText={alterText(k.erstellt_am, jetzt)}
          onTippen={() => statusWechsel(k, 'abholbereit', 'in_bearbeitung', 'ist abholbereit')} />
      ),
    },
    {
      titel: 'Abholbereit',
      kopfstil: 'blass',
      kaertchen: listen.abholbereit,
      karte: (k) => (
        <div key={k.id} className="flex items-center gap-2">
          <div className="flex-1">
            <KaertchenKarte kaertchen={k} zeitText={alterText(k.abholbereit_am, jetzt)} />
          </div>
          <button
            onClick={() => statusWechsel(k, 'in_bearbeitung', 'abholbereit', 'zurück in Bearbeitung')}
            className="kaertchen-schatten cursor-pointer rounded-lg border border-linie px-3 py-6 text-schrift-gedimmt hover:bg-flaeche-hell">
            Rückgängig
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-screen flex-col">
      <Kopfzeile titel="Belegen" benutzername={session.benutzername} />

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
