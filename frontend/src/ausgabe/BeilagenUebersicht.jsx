import { useState } from 'react';
import { apiGet } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';

export default function BeilagenUebersicht() {
  const [offen, setOffen] = useState(false);
  const [uebersicht, setUebersicht] = useState([]);

  useLiveUpdate(['artikel', 'beilagen'], () => {
    apiGet('/api/ausgabe/beilagen-uebersicht').then(setUebersicht).catch(() => {});
  });

  return (
    <div className="border-t border-linie bg-flaeche">
      <button onClick={() => setOffen(!offen)}
        className="w-full cursor-pointer px-4 py-3 text-left text-lg text-navy hover:bg-flaeche-hell">
        {offen ? '▾' : '▸'} Beilagen-Übersicht
      </button>
      {offen && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-6 pb-4 md:grid-cols-3">
          {uebersicht.map((eintrag) => (
            <p key={eintrag.artikel_name}>
              <span className="font-semibold">{eintrag.artikel_name}:</span>{' '}
              <span className="text-schrift-gedimmt">
                {eintrag.beilagen.length > 0 ? eintrag.beilagen.join(', ') : 'keine Beilagen'}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
