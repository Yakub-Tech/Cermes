import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../api.js';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import Pillenschalter from '../komponenten/Pillenschalter.jsx';

export default function TvDesignKarte({ texte }) {
  const [design, setDesign] = useState(null);
  const [meldung, setMeldung] = useState('');
  const [fehler, setFehler] = useState('');
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    apiGet('/api/einstellungen')
      .then((einstellungen) => setDesign(einstellungen.tv_design))
      .catch((f) => setFehler(f.message));
  }, []);

  async function waehlen(neuesDesign) {
    if (speichert) return;
    setSpeichert(true);
    setMeldung('');
    setFehler('');
    try {
      const einstellungen = await apiPut('/api/einstellungen', { tv_design: neuesDesign });
      setDesign(einstellungen.tv_design);
      setMeldung(texte.gespeichert);
    } catch (f) {
      setFehler(f.message);
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <div className="kaertchen-schatten rounded-lg border border-linie bg-flaeche p-4">
      <h3 className="mb-1.5 font-display text-sm font-semibold text-schrift">{texte.tvDesignUeberschrift}</h3>
      <p className="mb-2.5 text-xs text-schrift-gedimmt">{texte.tvDesignErklaerung}</p>
      <div role="group" aria-label={texte.tvDesignUeberschrift} className="mb-2.5 flex gap-2">
        <Pillenschalter an={design === 'dunkel'} art="haupt" onClick={() => waehlen('dunkel')}
          className="px-4 py-1.5 text-sm">
          {texte.tvDesignDunkel}
        </Pillenschalter>
        <Pillenschalter an={design === 'hell'} art="haupt" onClick={() => waehlen('hell')}
          className="px-4 py-1.5 text-sm">
          {texte.tvDesignHell}
        </Pillenschalter>
      </div>
      {meldung && <Hinweiskasten art="erfolg" className="px-2 py-1.5 text-sm">{meldung}</Hinweiskasten>}
      {fehler && <Hinweiskasten art="fehler" className="px-2 py-1.5 text-sm">{fehler}</Hinweiskasten>}
    </div>
  );
}
