import { useState } from 'react';
import { apiPost } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';

export default function Kopfzeile({ titel, benutzername, rechts }) {
  const [logoVersion, setLogoVersion] = useState(0);
  useLiveUpdate(['logo'], () => setLogoVersion((v) => v + 1));

  async function abmelden() {
    await apiPost('/api/logout');
    location.reload();
  }

  return (
    <header>
      <div className="flex items-center gap-4 bg-flaeche px-4 py-2">
        <img src={`/logo/aktuell?v=${logoVersion}`} alt="Vereinslogo" className="h-12 w-12" />
        <h1 className="font-display text-2xl text-navy">{titel}</h1>
        <div className="ml-auto flex items-center gap-4">
          {rechts}
          {benutzername && (
            <div className="flex items-center gap-3">
              <span className="text-schrift-gedimmt">{benutzername}</span>
              <button
                onClick={abmelden}
                className="cursor-pointer rounded border border-linie px-3 py-1 text-schrift-gedimmt hover:bg-flaeche-hell"
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
