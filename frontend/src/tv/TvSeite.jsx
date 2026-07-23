import { useState } from 'react';
import { apiGet } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import StatusSpalte from './StatusSpalte.jsx';
import WerbeLeiste from './WerbeLeiste.jsx';

export default function TvSeite() {
  const [kaertchen, setKaertchen] = useState({ in_bearbeitung: [], abholbereit: [] });
  const [werbung, setWerbung] = useState([]);

  useLiveUpdate(['kaertchen', 'werbung'], () => {
    apiGet('/api/tv/kaertchen').then(setKaertchen).catch(() => {});
    apiGet('/api/tv/werbung').then(setWerbung).catch(() => {});
  });

  return (
    <main className="flex h-screen cursor-none select-none flex-col gap-3 overflow-hidden bg-grund p-3">
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-w-0 flex-1 overflow-hidden rounded-lg bg-flaeche shadow-sm">
          <StatusSpalte titel="In Bearbeitung" titelTuerkisch="Hazırlanıyor"
            kaertchen={kaertchen.in_bearbeitung} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden rounded-lg bg-flaeche shadow-sm">
          <StatusSpalte titel="Abholbereit" titelTuerkisch="Hazır"
            kaertchen={kaertchen.abholbereit} />
        </div>
      </div>
      {werbung.length > 0 && (
        <footer className="flex h-[22vh] overflow-hidden rounded-lg bg-flaeche shadow-sm">
          <WerbeLeiste bilder={werbung} />
        </footer>
      )}
    </main>
  );
}
