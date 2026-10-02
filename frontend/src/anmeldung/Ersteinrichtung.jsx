import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../api.js';
import Urheberrechtshinweis from '../komponenten/Urheberrechtshinweis.jsx';

export default function Ersteinrichtung() {
  const navigiere = useNavigate();
  const [einrichtungsKennwort, setEinrichtungsKennwort] = useState('');
  const [benutzername, setBenutzername] = useState('');
  const [passwort, setPasswort] = useState('');
  const [wiederholung, setWiederholung] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  async function einrichten(ereignis) {
    ereignis.preventDefault();
    if (passwort !== wiederholung) {
      setFehler('Die beiden Passwörter stimmen nicht überein.');
      return;
    }
    setLaeuft(true);
    setFehler('');
    try {
      await apiPost('/api/ersteinrichtung', { einrichtungsKennwort, benutzername, passwort });
      navigiere('/admin', { replace: true });
    } catch (f) {
      setFehler(f.message);
      setLaeuft(false);
    }
  }

  return (
    <>
      <main className="flex min-h-screen items-center justify-center p-4">
        <form onSubmit={einrichten}
          className="w-full max-w-md rounded-xl border border-linie bg-flaeche p-8 shadow-2xl">
          <img src="/logo/aktuell" alt="Vereinslogo" className="mx-auto mb-4 h-28 w-28" />
          <h1 className="mb-1 text-center font-display text-3xl text-navy">Willkommen bei Cermes</h1>
          <p className="mb-6 text-center text-schrift-gedimmt">
            Zum Start wird das erste Verwaltungs-Konto angelegt. Damit verwaltest du
            später Artikel, Benutzer und Statistik.
          </p>

          <label className="mb-1 block text-sm text-schrift-gedimmt" htmlFor="einrichtungsKennwort">
            Einrichtungskennwort
          </label>
          <input id="einrichtungsKennwort" value={einrichtungsKennwort} autoFocus autoComplete="off"
            onChange={(e) => setEinrichtungsKennwort(e.target.value)}
            aria-describedby="einrichtungsKennwortHinweis"
            className="mb-1 w-full rounded border border-linie bg-grund px-3 py-3 font-mono text-lg outline-none focus:border-blau-hell" />
          <p id="einrichtungsKennwortHinweis" className="mb-4 text-sm text-schrift-gedimmt">
            Das hast du vor dem ersten Start selbst festgelegt. Es steht in der Datei .env im
            Cermes-Ordner (siehe ANLEITUNG.md, Teil 1).
          </p>

          <label className="mb-1 block text-sm text-schrift-gedimmt" htmlFor="benutzername">
            Benutzername
          </label>
          <input id="benutzername" value={benutzername} autoComplete="username"
            onChange={(e) => setBenutzername(e.target.value)}
            className="mb-4 w-full rounded border border-linie bg-grund px-3 py-3 text-lg outline-none focus:border-blau-hell" />

          <label className="mb-1 block text-sm text-schrift-gedimmt" htmlFor="passwort">
            Passwort (mindestens 8 Zeichen)
          </label>
          <input id="passwort" type="password" value={passwort} autoComplete="new-password"
            onChange={(e) => setPasswort(e.target.value)}
            className="mb-4 w-full rounded border border-linie bg-grund px-3 py-3 text-lg outline-none focus:border-blau-hell" />

          <label className="mb-1 block text-sm text-schrift-gedimmt" htmlFor="wiederholung">
            Passwort wiederholen
          </label>
          <input id="wiederholung" type="password" value={wiederholung} autoComplete="new-password"
            onChange={(e) => setWiederholung(e.target.value)}
            className="mb-4 w-full rounded border border-linie bg-grund px-3 py-3 text-lg outline-none focus:border-blau-hell" />

          {fehler && (
            <p className="mb-4 rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>
          )}

          <button type="submit" disabled={laeuft}
            className="w-full cursor-pointer rounded-full bg-blau py-3 text-lg font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-50">
            Admin-Konto anlegen
          </button>
        </form>
      </main>
      <Urheberrechtshinweis />
    </>
  );
}
