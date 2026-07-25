import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import { useInaktivitaetsAbmeldung } from '../anmeldung/useInaktivitaetsAbmeldung.js';
import { formatiereCountdown } from '../anmeldung/inaktivitaet.js';

export default function Kopfzeile({ titel, benutzername, rechts, aufLogoKlick }) {
  const [logoVersion, setLogoVersion] = useState(0);
  useLiveUpdate(['logo'], () => setLogoVersion((v) => v + 1));
  const { verbleibendeSekunden } = useInaktivitaetsAbmeldung(!!benutzername);

  async function abmelden() {
    await apiPost('/api/logout');
    location.reload();
  }

  return (
    <header>
      <div className="flex items-center gap-4 bg-flaeche px-4 py-2">
        <Link to="/" onClick={aufLogoKlick} className="transition-opacity hover:opacity-80">
          <img src={`/logo/aktuell?v=${logoVersion}`} alt="Vereinslogo" className="h-12 w-12" />
        </Link>
        <h1 className="font-display text-2xl text-navy">{titel}</h1>
        <div className="ml-auto flex items-center gap-4">
          {rechts}
          {benutzername && (
            <div className="flex items-center gap-3">
              <span className="text-schrift-gedimmt">{benutzername}</span>
              <span className="text-sm text-schrift-gedimmt">
                Abmeldung in {formatiereCountdown(verbleibendeSekunden)}
              </span>
              <button
                onClick={abmelden}
                className="cursor-pointer rounded-full border border-linie px-3 py-1 text-schrift-gedimmt hover:bg-flaeche-hell"
              >
                Abmelden
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="akzentrand h-px" />
    </header>
  );
}
