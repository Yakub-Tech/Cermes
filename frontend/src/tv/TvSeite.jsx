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
    <main className="flex h-screen cursor-none select-none flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 border-r border-linie">
          <StatusSpalte titel="In Bearbeitung" kaertchen={kaertchen.in_bearbeitung} />
        </div>
        <div className="min-w-0 flex-1">
          <StatusSpalte titel="Abholbereit" kaertchen={kaertchen.abholbereit} />
        </div>
      </div>
      <footer className="flex h-[22vh] border-t border-linie">
        <WerbeLeiste bilder={werbung} />
      </footer>
    </main>
  );
}
