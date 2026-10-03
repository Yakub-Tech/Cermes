import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { useInaktivitaetsAbmeldung } from '../anmeldung/useInaktivitaetsAbmeldung.js';
import { formatiereCountdown } from '../anmeldung/inaktivitaet.js';
import { useGeraeteDesign } from '../design/useGeraeteDesign.js';
import { de, tr } from '../sprache/kopfzeile.js';
import DesignSchalter from './DesignSchalter.jsx';

export default function Kopfzeile({ titel, benutzername, rechts, aufLogoKlick, sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;
  const [logoVersion, setLogoVersion] = useState(0);
  useLiveUpdate(['logo'], () => setLogoVersion((v) => v + 1));
  const { verbleibendeSekunden } = useInaktivitaetsAbmeldung(!!benutzername);
  const [design, setDesign] = useGeraeteDesign();

  async function abmelden() {
    await apiPost('/api/logout');
    location.reload();
  }

  return (
    <header>
      <div className="flex items-center gap-2.5 bg-flaeche px-2.5 py-1.5">
        <Link to="/" onClick={aufLogoKlick} className="transition-opacity hover:opacity-80">
          <img src={`/logo/aktuell?v=${logoVersion}`} alt={texte.vereinslogo} className="h-8 w-8" />
        </Link>
        <h1 className="font-display text-base text-navy">{titel}</h1>
        <div className="ml-auto flex items-center gap-2.5">
          {rechts}
          <DesignSchalter design={design} onWahl={setDesign} texte={texte} />
          {benutzername && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-schrift-gedimmt">{benutzername}</span>
              <span className="text-xs text-schrift-gedimmt">
                {texte.abmeldungIn} {formatiereCountdown(verbleibendeSekunden)}
              </span>
              <button
                onClick={abmelden}
                className="cursor-pointer rounded-full border border-linie px-2 py-1 text-xs text-schrift-gedimmt hover:bg-flaeche-hell"
              >
                {texte.abmelden}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="akzentrand h-px" />
    </header>
  );
}
