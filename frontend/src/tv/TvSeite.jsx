import { useEffect, useState } from 'react';
import { apiGet } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import StatusSpalte from './StatusSpalte.jsx';
import WerbeLeiste from './WerbeLeiste.jsx';
import Urheberrechtshinweis from '../komponenten/Urheberrechtshinweis.jsx';

const SKALIERUNG = 0.67;

function berechneVirtuelleGroesse() {
  return {
    breite: window.innerWidth / SKALIERUNG,
    hoehe: window.innerHeight / SKALIERUNG,
  };
}

export default function TvSeite() {
  const [kaertchen, setKaertchen] = useState({ in_bearbeitung: [], abholbereit: [] });
  const [werbung, setWerbung] = useState([]);
  const [virtuelleGroesse, setVirtuelleGroesse] = useState(berechneVirtuelleGroesse);

  useLiveUpdate(['kaertchen'], () => {
    apiGet('/api/tv/kaertchen').then(setKaertchen).catch(() => {});
  });
  useLiveUpdate(['werbung'], () => {
    apiGet('/api/tv/werbung').then(setWerbung).catch(() => {});
  });

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
        <main className="flex h-full cursor-none select-none flex-col gap-3 overflow-hidden bg-grund p-3">
          <div className="flex min-h-0 flex-1 gap-3">
            <div className="min-w-0 flex-1">
              <StatusSpalte titel="In Bearbeitung" titelTuerkisch="Hazırlanıyor"
                kaertchen={kaertchen.in_bearbeitung} />
            </div>
            <div className="min-w-0 flex-1">
              <StatusSpalte titel="Abholbereit" titelTuerkisch="Hazır"
                kaertchen={kaertchen.abholbereit} />
            </div>
          </div>
          {werbung.length > 0 && (
            <footer className="flex h-[22%] overflow-hidden rounded-lg bg-flaeche shadow-sm">
              <WerbeLeiste bilder={werbung} />
            </footer>
          )}
        </main>
      </div>
      <Urheberrechtshinweis />
    </>
  );
}
