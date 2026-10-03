import { useEffect, useState } from 'react';
import { useVerbindungsStatus } from './useVerbindungsStatus.js';
import { formatiereDatum, formatiereUhrzeit, berlinerJahr } from './uhrzeitFormat.js';
import { berechneUrheberrechtsText, URHEBERRECHT_STARTJAHR } from './urheberrechtsText.js';
import { de, tr } from '../sprache/fusszeile.js';

export default function Fusszeile({ sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;
  const verbunden = useVerbindungsStatus();
  const [uhrzeit, setUhrzeit] = useState(new Date());

  useEffect(() => {
    const intervall = setInterval(() => setUhrzeit(new Date()), 1000);
    return () => clearInterval(intervall);
  }, []);

  const urheberrechtsText = berechneUrheberrechtsText(URHEBERRECHT_STARTJAHR, berlinerJahr(uhrzeit));

  return (
    <footer>
      <div className="akzentrand h-px" />
      <div className="flex items-center justify-end gap-x-8 bg-flaeche px-2.5 py-1.5 text-xs text-schrift-gedimmt">
        <span className={`flex items-center gap-1.5 ${verbunden ? '' : 'font-semibold text-gefahr-schrift'}`}>
          <span
            className={`h-1.5 w-1.5 rounded-full ${verbunden ? 'bg-schrift-gedimmt' : 'bg-gefahr'}`}
          />
          {verbunden ? texte.verbunden : texte.verbindungUnterbrochen}
        </span>
        <span className="tabular-nums">{formatiereDatum(uhrzeit)}</span>
        <span className="tabular-nums">{formatiereUhrzeit(uhrzeit)}</span>
        <span>{urheberrechtsText}</span>
      </div>
    </footer>
  );
}
