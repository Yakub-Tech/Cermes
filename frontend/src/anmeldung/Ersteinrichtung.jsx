import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../api.js';
import Urheberrechtshinweis from '../komponenten/Urheberrechtshinweis.jsx';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import SprachSchalter from '../komponenten/SprachSchalter.jsx';
import DesignSchalter from '../komponenten/DesignSchalter.jsx';
import { Button } from '@/komponenten/ui/button';
import { Input } from '@/komponenten/ui/input';
import { Label } from '@/komponenten/ui/label';
import { useGeraeteDesign } from '../design/useGeraeteDesign.js';
import { useStationsSprache } from '../sprache/useStationsSprache.js';
import { de, tr } from '../sprache/ersteinrichtung.js';
import { de as kopfzeileDe, tr as kopfzeileTr } from '../sprache/kopfzeile.js';

export default function Ersteinrichtung() {
  const navigiere = useNavigate();
  const [einrichtungsKennwort, setEinrichtungsKennwort] = useState('');
  const [benutzername, setBenutzername] = useState('');
  const [passwort, setPasswort] = useState('');
  const [wiederholung, setWiederholung] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [sprache, setSprache] = useStationsSprache();
  const [design, setDesign] = useGeraeteDesign();
  const texte = sprache === 'tr' ? tr : de;
  const designTexte = sprache === 'tr' ? kopfzeileTr : kopfzeileDe;

  async function einrichten(ereignis) {
    ereignis.preventDefault();
    if (passwort !== wiederholung) {
      setFehler(texte.passwoerterUngleich);
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
          className="relative w-full max-w-md rounded-2xl border border-linie bg-flaeche p-8 shadow-[0_2px_8px_var(--schattenfarbe)]">
          <div className="absolute left-3 top-3">
            <SprachSchalter sprache={sprache} onWahl={setSprache} />
          </div>
          <div className="absolute right-3 top-3">
            <DesignSchalter design={design} onWahl={setDesign} texte={designTexte} />
          </div>
          <img src="/logo/aktuell" alt={texte.vereinslogo} className="mx-auto mb-4 mt-4 h-28 w-28 rounded-2xl ring-1 ring-linie" />
          <h1 className="mb-1 text-center font-display text-3xl font-bold tracking-tight text-schrift">{texte.willkommen}</h1>
          <p className="mb-6 text-center text-schrift-gedimmt">
            {texte.einleitung}
          </p>

          <Label htmlFor="einrichtungsKennwort">{texte.einrichtungsKennwort}</Label>
          <Input id="einrichtungsKennwort" value={einrichtungsKennwort} autoFocus autoComplete="off"
            onChange={(e) => setEinrichtungsKennwort(e.target.value)}
            aria-describedby="einrichtungsKennwortHinweis"
            className="mb-1 font-mono" />
          <p id="einrichtungsKennwortHinweis" className="mb-4 text-sm text-schrift-gedimmt">
            {texte.einrichtungsKennwortHinweis}
          </p>

          <Label htmlFor="benutzername">{texte.benutzername}</Label>
          <Input id="benutzername" value={benutzername} autoComplete="username"
            onChange={(e) => setBenutzername(e.target.value)} className="mb-4" />

          <Label htmlFor="passwort">{texte.passwort}</Label>
          <Input id="passwort" type="password" value={passwort} autoComplete="new-password"
            onChange={(e) => setPasswort(e.target.value)} className="mb-4" />

          <Label htmlFor="wiederholung">{texte.wiederholung}</Label>
          <Input id="wiederholung" type="password" value={wiederholung} autoComplete="new-password"
            onChange={(e) => setWiederholung(e.target.value)} className="mb-4" />

          {fehler && <Hinweiskasten art="fehler" className="mb-4">{fehler}</Hinweiskasten>}

          <Button type="submit" disabled={laeuft}
            className="h-auto w-full cursor-pointer py-3 text-lg font-semibold">
            {texte.anlegen}
          </Button>
        </form>
      </main>
      <Urheberrechtshinweis />
    </>
  );
}
