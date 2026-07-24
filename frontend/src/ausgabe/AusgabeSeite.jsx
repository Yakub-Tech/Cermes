import { useEffect, useState } from 'react';
import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import Snackbar from '../komponenten/Snackbar.jsx';
import KaertchenKarte from '../komponenten/KaertchenKarte.jsx';
import { useSession } from '../anmeldung/useSession.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { apiGet, apiPost } from '../api.js';

function minutenSeit(iso, jetzt) {
  return Math.floor((jetzt - new Date(iso).getTime()) / 60000);
}

function alterText(iso, jetzt) {
  const minuten = minutenSeit(iso, jetzt);
  if (minuten < 1) return 'gerade eben';
  return `vor ${minuten} min`;
}

export default function AusgabeSeite() {
  const session = useSession('ausgabe');
  const [listen, setListen] = useState({ in_bearbeitung: [], abholbereit: [], zuletzt_abgeholt: [] });
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
      titel: 'In Bearbeitung',
      kaertchen: listen.in_bearbeitung,
      karte: (k) => (
        <KaertchenKarte key={k.id} kaertchen={k} zeitText={alterText(k.erstellt_am, jetzt)}
          onTippen={() => statusWechsel(k, 'abholbereit', 'in_bearbeitung', 'ist abholbereit')} />
      ),
    },
    {
      titel: 'Abholbereit',
      kaertchen: listen.abholbereit,
      karte: (k) => {
        const wartet = minutenSeit(k.abholbereit_am, jetzt);
        return (
          <div key={k.id} className="flex items-center gap-2">
            <div className="flex-1">
              <KaertchenKarte kaertchen={k}
                zeitText={wartet >= warnminuten ? `wartet seit ${wartet} min!` : alterText(k.abholbereit_am, jetzt)}
                warnung={wartet >= warnminuten}
                onTippen={() => statusWechsel(k, 'abgeholt', 'abholbereit', 'wurde abgeholt')} />
            </div>
            <button
              onClick={() => apiPost(`/api/ausgabe/status/${k.id}`, { status: 'in_bearbeitung' }).catch(() => {})}
              className="cursor-pointer rounded-lg border border-linie px-3 py-6 text-schrift-gedimmt hover:bg-flaeche-hell">
              Rückgängig
            </button>
          </div>
        );
      },
    },
    {
      titel: 'Zuletzt abgeholt',
      kaertchen: listen.zuletzt_abgeholt,
      karte: (k) => (
        <div key={k.id} className="flex items-center gap-2">
          <div className="flex-1 opacity-60">
            <KaertchenKarte kaertchen={k} zeitText={alterText(k.abgeholt_am, jetzt)} />
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
      <Kopfzeile titel="Ausgabe" benutzername={session.benutzername} />

      <div className="grid min-h-0 flex-1 grid-cols-3 gap-px bg-linie">
        {spalten.map((spalte) => (
          <section key={spalte.titel} className="flex min-h-0 flex-col bg-grund">
            <h2 className="px-4 py-3 text-center font-display text-xl text-navy">
              {spalte.titel} ({spalte.kaertchen.length})
            </h2>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
              {spalte.kaertchen.map(spalte.karte)}
            </div>
          </section>
        ))}
      </div>

      {snackbar && (
        <Snackbar meldung={snackbar.meldung} onRueckgaengig={snackbar.rueckgaengig}
          onZu={() => setSnackbar(null)} />
      )}
    </div>
  );
}
