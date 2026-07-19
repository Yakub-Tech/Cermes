import { useState } from 'react';
import { apiGet } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import WerbeKarussell from './WerbeKarussell.jsx';
import EndlosSpalte from './EndlosSpalte.jsx';
import logo from '../design/logo.png';

export default function TvSeite() {
  const [kaertchen, setKaertchen] = useState({ in_bearbeitung: [], abholbereit: [] });
  const [werbung, setWerbung] = useState([]);

  useLiveUpdate(['kaertchen', 'werbung'], () => {
    apiGet('/api/tv/kaertchen').then(setKaertchen).catch(() => {});
    apiGet('/api/tv/werbung').then(setWerbung).catch(() => {});
  });

  return (
    <main className="grid h-screen cursor-none select-none overflow-hidden"
      style={{ gridTemplateColumns: '30fr 35fr 35fr' }}>
      <section className="relative min-h-0 border-r border-linie">
        <WerbeKarussell bilder={werbung} />
        <img src={logo} alt="" className="absolute bottom-4 left-4 h-16 w-16 opacity-70" />
      </section>
      <EndlosSpalte titel="In Bearbeitung" kaertchen={kaertchen.in_bearbeitung} />
      <div className="min-h-0 border-l border-linie">
        <EndlosSpalte titel="Abholbereit" kaertchen={kaertchen.abholbereit} />
      </div>
    </main>
  );
}
