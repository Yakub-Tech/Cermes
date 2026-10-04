import { useState } from 'react';
import Reiterleiste from '../komponenten/Reiterleiste.jsx';
import StatistikEinzeltag from './StatistikEinzeltag.jsx';
import StatistikZeitraum from './StatistikZeitraum.jsx';
import { de, tr } from '../sprache/statistik.js';

export default function StatistikSeite({ sprache = 'de' }) {
  const [reiter, setReiter] = useState('einzeltag');
  const texte = sprache === 'tr' ? tr : de;

  return (
    <div>
      <h2 className="mb-4 font-display text-base font-semibold tracking-tight text-schrift">{texte.titel}</h2>

      <Reiterleiste className="mb-4" aktiv={reiter} onWahl={setReiter}
        reiter={[['einzeltag', texte.reiterEinzeltag], ['zeitraum', texte.reiterZeitraum]]} />

      <div className={reiter === 'einzeltag' ? 'block' : 'hidden'}>
        <StatistikEinzeltag sprache={sprache} aktiv={reiter === 'einzeltag'} />
      </div>
      <div className={reiter === 'zeitraum' ? 'block' : 'hidden'}>
        <StatistikZeitraum sprache={sprache} aktiv={reiter === 'zeitraum'} />
      </div>
    </div>
  );
}
