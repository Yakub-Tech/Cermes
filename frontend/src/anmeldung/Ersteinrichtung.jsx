import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../api.js';
import Urheberrechtshinweis from '../komponenten/Urheberrechtshinweis.jsx';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import { Button } from '@/komponenten/ui/button';
import { Input } from '@/komponenten/ui/input';
import { Label } from '@/komponenten/ui/label';

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
          className="w-full max-w-md rounded-2xl border border-linie bg-flaeche p-8 shadow-[0_2px_8px_var(--schattenfarbe)]">
          <img src="/logo/aktuell" alt="Vereinslogo" className="mx-auto mb-4 h-28 w-28 rounded-2xl ring-1 ring-linie" />
          <h1 className="mb-1 text-center font-display text-3xl font-bold tracking-tight text-schrift">Willkommen bei Cermes</h1>
          <p className="mb-6 text-center text-schrift-gedimmt">
            Zum Start wird das erste Verwaltungs-Konto angelegt. Damit verwaltest du
            später Artikel, Benutzer und Statistik.
          </p>

          <Label htmlFor="einrichtungsKennwort">Einrichtungskennwort</Label>
          <Input id="einrichtungsKennwort" value={einrichtungsKennwort} autoFocus autoComplete="off"
            onChange={(e) => setEinrichtungsKennwort(e.target.value)}
            aria-describedby="einrichtungsKennwortHinweis"
            className="mb-1 font-mono" />
          <p id="einrichtungsKennwortHinweis" className="mb-4 text-sm text-schrift-gedimmt">
            Das hast du vor dem ersten Start selbst festgelegt. Es steht in der Datei .env im
            Cermes-Ordner (siehe ANLEITUNG.md, Teil 1).
          </p>

          <Label htmlFor="benutzername">Benutzername</Label>
          <Input id="benutzername" value={benutzername} autoComplete="username"
            onChange={(e) => setBenutzername(e.target.value)} className="mb-4" />

          <Label htmlFor="passwort">Passwort (mindestens 8 Zeichen)</Label>
          <Input id="passwort" type="password" value={passwort} autoComplete="new-password"
            onChange={(e) => setPasswort(e.target.value)} className="mb-4" />

          <Label htmlFor="wiederholung">Passwort wiederholen</Label>
          <Input id="wiederholung" type="password" value={wiederholung} autoComplete="new-password"
            onChange={(e) => setWiederholung(e.target.value)} className="mb-4" />

          {fehler && <Hinweiskasten art="fehler" className="mb-4">{fehler}</Hinweiskasten>}

          <Button type="submit" disabled={laeuft}
            className="h-auto w-full cursor-pointer py-3 text-lg font-semibold">
            Admin-Konto anlegen
          </Button>
        </form>
      </main>
      <Urheberrechtshinweis />
    </>
  );
}
