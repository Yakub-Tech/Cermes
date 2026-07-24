import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiPost } from '../api.js';

const ansichtsTitel = {
  kasse: 'Kasse',
  ausgabe: 'Ausgabe',
  admin: 'Verwaltung',
};

export default function LoginSeite() {
  const { ansicht } = useParams();
  const navigiere = useNavigate();
  const [benutzername, setBenutzername] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  const titel = ansichtsTitel[ansicht] || 'Anmeldung';

  async function anmelden(ereignis) {
    ereignis.preventDefault();
    setLaeuft(true);
    setFehler('');
    try {
      const { rolle } = await apiPost('/api/login', { benutzername, passwort });
      navigiere(rolle === 'admin' ? '/admin' : `/${rolle}`, { replace: true });
    } catch (f) {
      setFehler(f.message);
      setLaeuft(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={anmelden}
        className="w-full max-w-sm rounded-xl border border-linie bg-flaeche p-8 shadow-2xl">
        <img src="/logo/aktuell" alt="Vereinslogo" className="mx-auto mb-4 h-28 w-28" />
        <h1 className="mb-1 text-center font-display text-3xl text-navy">Cermes</h1>
        <p className="mb-6 text-center text-schrift-gedimmt">Anmeldung: {titel}</p>

        <label className="mb-1 block text-sm text-schrift-gedimmt" htmlFor="benutzername">
          Benutzername
        </label>
        <input id="benutzername" value={benutzername} autoFocus autoComplete="username"
          onChange={(e) => setBenutzername(e.target.value)}
          className="mb-4 w-full rounded border border-linie bg-grund px-3 py-3 text-lg outline-none focus:border-blau-hell" />

        <label className="mb-1 block text-sm text-schrift-gedimmt" htmlFor="passwort">
          Passwort
        </label>
        <input id="passwort" type="password" value={passwort} autoComplete="current-password"
          onChange={(e) => setPasswort(e.target.value)}
          className="mb-4 w-full rounded border border-linie bg-grund px-3 py-3 text-lg outline-none focus:border-blau-hell" />

        {fehler && (
          <p className="mb-4 rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>
        )}

        <button type="submit" disabled={laeuft}
          className="w-full cursor-pointer rounded bg-blau py-3 text-lg font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-50">
          Anmelden
        </button>
      </form>
    </main>
  );
}
