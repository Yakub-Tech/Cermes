import { useState } from 'react';
import StatistikEinzeltag from './StatistikEinzeltag.jsx';
import StatistikZeitraum from './StatistikZeitraum.jsx';

export default function StatistikSeite() {
  const [reiter, setReiter] = useState('einzeltag');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-4 font-display text-2xl text-navy">Statistik</h2>
        <button onClick={() => setReiter('einzeltag')}
          className={`cursor-pointer rounded-full px-4 py-2 ${
            reiter === 'einzeltag' ? 'bg-blau font-bold text-flaeche' : 'border border-linie text-schrift-gedimmt hover:bg-flaeche-hell'
          }`}>
          Einzeltag
        </button>
        <button onClick={() => setReiter('zeitraum')}
          className={`cursor-pointer rounded-full px-4 py-2 ${
            reiter === 'zeitraum' ? 'bg-blau font-bold text-flaeche' : 'border border-linie text-schrift-gedimmt hover:bg-flaeche-hell'
          }`}>
          Zeitraum
        </button>
      </div>

      {reiter === 'einzeltag' ? <StatistikEinzeltag /> : <StatistikZeitraum />}
    </div>
  );
}
