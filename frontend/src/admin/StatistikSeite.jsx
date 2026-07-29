import { useState } from 'react';
import StatistikEinzeltag from './StatistikEinzeltag.jsx';
import StatistikZeitraum from './StatistikZeitraum.jsx';

export default function StatistikSeite() {
  const [reiter, setReiter] = useState('einzeltag');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2.5 font-display text-base text-navy">Statistik</h2>
        <button onClick={() => setReiter('einzeltag')}
          className={`cursor-pointer rounded-full px-2.5 py-1.5 ${
            reiter === 'einzeltag' ? 'bg-blau font-bold text-flaeche' : 'border border-linie text-schrift-gedimmt hover:bg-flaeche-hell'
          }`}>
          Einzeltag
        </button>
        <button onClick={() => setReiter('zeitraum')}
          className={`cursor-pointer rounded-full px-2.5 py-1.5 ${
            reiter === 'zeitraum' ? 'bg-blau font-bold text-flaeche' : 'border border-linie text-schrift-gedimmt hover:bg-flaeche-hell'
          }`}>
          Zeitraum
        </button>
      </div>

      <div className={reiter === 'einzeltag' ? 'block' : 'hidden'}>
        <StatistikEinzeltag />
      </div>
      <div className={reiter === 'zeitraum' ? 'block' : 'hidden'}>
        <StatistikZeitraum />
      </div>
    </div>
  );
}
