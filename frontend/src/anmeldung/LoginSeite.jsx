import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiPost } from '../api.js';
import { sollEnterAbsenden } from './enterAbsenden.js';
import { inaktivHinweisAbholen } from './inaktivHinweisSpeicher.js';
import Urheberrechtshinweis from '../komponenten/Urheberrechtshinweis.jsx';
import SprachSchalter from '../komponenten/SprachSchalter.jsx';
import NichtGefundenSeite from '../komponenten/NichtGefundenSeite.jsx';
import { useStationsSprache } from '../sprache/useStationsSprache.js';
import { de, tr, inaktivHinweisDe, inaktivHinweisTr } from '../sprache/login.js';

export default function LoginSeite() {
  const { ansicht } = useParams();
  const navigiere = useNavigate();
  const [benutzername, setBenutzername] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [abgemeldetNachMinuten, setAbgemeldetNachMinuten] = useState(null);
  const [sprache, setSprache] = useStationsSprache();
  const texte = sprache === 'tr' ? tr : de;

  useEffect(() => {
    const minuten = inaktivHinweisAbholen(() => sessionStorage);
    if (minuten === null) return;
    setAbgemeldetNachMinuten(minuten);
  }, []);

  const ansichtBekannt = Object.hasOwn(texte.rollenTitel, ansicht);
  const titel = texte.rollenTitel[ansicht];

  function beiEnterAbsenden(ereignis) {
    if (!sollEnterAbsenden({ taste: ereignis.key, wiederholt: ereignis.repeat, laeuft })) return;
    ereignis.preventDefault();
    ereignis.currentTarget.form.requestSubmit();
  }

  async function anmelden(ereignis) {
    ereignis.preventDefault();
    if (laeuft) return;
    setLaeuft(true);
    setFehler('');
    try {
      const { rolle } = await apiPost('/api/login', { benutzername, passwort });
      const rolleZuPfad = { admin: '/admin', verwaltung: '/admin' };
      navigiere(rolleZuPfad[rolle] || `/${rolle}`, { replace: true });
    } catch (f) {
      setFehler(f.message);
      setLaeuft(false);
    }
  }

  if (!ansichtBekannt) return <NichtGefundenSeite />;

  return (
    <>
      <main className="anmeldung flex min-h-screen items-center justify-center p-4">
        <form onSubmit={anmelden}
          className="relative w-full max-w-sm rounded-xl border border-linie bg-flaeche p-8 shadow-2xl">
          <div className="absolute left-3 top-3">
            <SprachSchalter sprache={sprache} onWahl={setSprache} />
          </div>
          <Link to="/" className="mx-auto mb-4 block w-28 transition-opacity hover:opacity-80">
            <img src="/logo/aktuell" alt={texte.vereinslogo} className="h-28 w-28" />
          </Link>
          <h1 className="mb-1 text-center font-display text-3xl text-navy">Cermes</h1>
          <p className="text-center text-schrift-gedimmt">{texte.anmeldung}</p>
          <p className="mb-6 text-center text-sm italic text-schrift-gedimmt/60">{titel}</p>

          <label className="mb-1 block text-sm text-schrift-gedimmt" htmlFor="benutzername">
            {texte.benutzername}
          </label>
          <input id="benutzername" value={benutzername} autoFocus autoComplete="username"
            onChange={(e) => setBenutzername(e.target.value)} onKeyDown={beiEnterAbsenden}
            className="mb-4 w-full rounded border border-linie bg-grund px-3 py-3 text-lg outline-none focus:border-blau-hell" />

          <label className="mb-1 block text-sm text-schrift-gedimmt" htmlFor="passwort">
            {texte.passwort}
          </label>
          <input id="passwort" type="password" value={passwort} autoComplete="current-password"
            onChange={(e) => setPasswort(e.target.value)} onKeyDown={beiEnterAbsenden}
            className="mb-4 w-full rounded border border-linie bg-grund px-3 py-3 text-lg outline-none focus:border-blau-hell" />

          {abgemeldetNachMinuten !== null && (
            <p className="mb-4 rounded border border-linie bg-flaeche-hell px-3 py-2 text-schrift-gedimmt">
              {sprache === 'tr' ? inaktivHinweisTr(abgemeldetNachMinuten) : inaktivHinweisDe(abgemeldetNachMinuten)}
            </p>
          )}

          {fehler && (
            <p className="mb-4 rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>
          )}

          <button type="submit" disabled={laeuft}
            className="w-full cursor-pointer rounded-full bg-blau py-3 text-lg font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-50">
            {texte.anmelden}
          </button>
        </form>
      </main>
      <Urheberrechtshinweis />
    </>
  );
}
