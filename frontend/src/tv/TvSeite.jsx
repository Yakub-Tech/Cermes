import { useEffect, useState } from 'react';
import { apiGet } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { useZustandsDesign } from '../design/useZustandsDesign.js';
import { useVerbindungsStatus } from '../komponenten/useVerbindungsStatus.js';
import StatusSpalte from './StatusSpalte.jsx';
import WerbeLeiste from './WerbeLeiste.jsx';
import Urheberrechtshinweis from '../komponenten/Urheberrechtshinweis.jsx';

const SKALIERUNG = 0.67;
const NACHLADEN_BEI_FEHLER_MS = 30000;

function berechneVirtuelleGroesse() {
  return {
    breite: window.innerWidth / SKALIERUNG,
    hoehe: window.innerHeight / SKALIERUNG,
  };
}

export default function TvSeite() {
  const { neueste, ladefehler } = useNeuesteAntwort(alleLaden);
  const verbunden = useVerbindungsStatus();
  const [kaertchen, setKaertchen] = useState({ in_bearbeitung: [], abholbereit: [] });
  const [kaertchenGeladen, setKaertchenGeladen] = useState(false);
  const [werbung, setWerbung] = useState([]);
  const [design, setDesign] = useState('dunkel');
  useZustandsDesign(design);
  const [virtuelleGroesse, setVirtuelleGroesse] = useState(berechneVirtuelleGroesse);

  function kaertchenUebernehmen(daten) {
    setKaertchen(daten);
    setKaertchenGeladen(true);
  }
  function kaertchenLaden() {
    neueste('/api/tv/kaertchen', apiGet('/api/tv/kaertchen'), kaertchenUebernehmen).catch(() => {});
  }
  function werbungLaden() {
    neueste('/api/tv/werbung', apiGet('/api/tv/werbung'), setWerbung).catch(() => {});
  }
  function designLaden() {
    neueste('/api/tv/design', apiGet('/api/tv/design'), (daten) => setDesign(daten.design)).catch(() => {});
  }
  function alleLaden() {
    kaertchenLaden();
    werbungLaden();
    designLaden();
  }
  useLiveUpdate(['kaertchen'], kaertchenLaden);
  useLiveUpdate(['werbung'], werbungLaden);
  useLiveUpdate(['einstellungen'], designLaden);

  useEffect(() => {
    if (!ladefehler) return undefined;
    const timer = setInterval(alleLaden, NACHLADEN_BEI_FEHLER_MS);
    return () => clearInterval(timer);
  }, [ladefehler]);

  useEffect(() => {
    function aktualisieren() {
      setVirtuelleGroesse(berechneVirtuelleGroesse());
    }
    window.addEventListener('resize', aktualisieren);
    return () => window.removeEventListener('resize', aktualisieren);
  }, []);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: virtuelleGroesse.breite,
          height: virtuelleGroesse.hoehe,
          transform: `scale(${SKALIERUNG})`,
          transformOrigin: 'top left',
        }}
      >
        <main className="flex h-full cursor-none select-none flex-col gap-3 overflow-hidden bg-tv-grund p-3">
          <div className="flex min-h-0 flex-1 gap-3">
            <div className="min-w-0 flex-1">
              <StatusSpalte titel="In Bearbeitung" titelTuerkisch="Hazırlanıyor"
                kaertchen={kaertchen.in_bearbeitung} geladen={kaertchenGeladen}
                neueHervorheben={false} />
            </div>
            <div className="min-w-0 flex-1">
              <StatusSpalte titel="Abholbereit" titelTuerkisch="Hazır" titelFarbe="text-erfolg-schrift"
                kaertchen={kaertchen.abholbereit} geladen={kaertchenGeladen}
                neueHervorheben />
            </div>
          </div>
          {werbung.length > 0 && (
            <footer className="kaertchen-schatten flex h-[22%] overflow-hidden rounded-xl border border-linie bg-flaeche">
              <WerbeLeiste bilder={werbung} />
            </footer>
          )}
        </main>
      </div>
      {(ladefehler || !verbunden) && (
        <span className="fixed bottom-1 left-1.5 z-50 rounded border border-gefahr/30 bg-flaeche px-2 py-0.5 text-xs text-gefahr-schrift pointer-events-none select-none">
          Verbindung gestört, Anzeige möglicherweise nicht aktuell · Bağlantı sorunu, bilgiler güncel olmayabilir
        </span>
      )}
      <Urheberrechtshinweis />
    </>
  );
}
