import { useState } from 'react';
import { apiPost } from '../api.js';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import { Button } from '@/komponenten/ui/button';
import { Input } from '@/komponenten/ui/input';
import { Label } from '@/komponenten/ui/label';

export default function PasswortAendernFormular({ texte, benutzernameVorbelegt, beiErfolg, beiZurueck }) {
  const [benutzername, setBenutzername] = useState(benutzernameVorbelegt);
  const [aktuell, setAktuell] = useState('');
  const [neu, setNeu] = useState('');
  const [wiederholt, setWiederholt] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  async function speichern(ereignis) {
    ereignis.preventDefault();
    if (laeuft) return;
    if (neu !== wiederholt) {
      setFehler(texte.passwoerterUngleich);
      return;
    }
    setLaeuft(true);
    setFehler('');
    try {
      await apiPost('/api/passwort-aendern', {
        benutzername, aktuellesPasswort: aktuell, neuesPasswort: neu,
      });
      beiErfolg(benutzername);
    } catch (f) {
      setFehler(f.message);
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={speichern}>
      <Label htmlFor="pw-benutzername">{texte.benutzername}</Label>
      <Input id="pw-benutzername" value={benutzername} autoFocus autoComplete="username"
        onChange={(e) => setBenutzername(e.target.value)} className="mb-4" />

      <Label htmlFor="pw-aktuell">{texte.aktuellesPasswort}</Label>
      <Input id="pw-aktuell" type="password" value={aktuell} autoComplete="current-password"
        onChange={(e) => setAktuell(e.target.value)} className="mb-4" />

      <Label htmlFor="pw-neu">{texte.neuesPasswort}</Label>
      <Input id="pw-neu" type="password" value={neu} autoComplete="new-password"
        onChange={(e) => setNeu(e.target.value)} className="mb-4" />

      <Label htmlFor="pw-wiederholt">{texte.neuesPasswortWiederholen}</Label>
      <Input id="pw-wiederholt" type="password" value={wiederholt} autoComplete="new-password"
        onChange={(e) => setWiederholt(e.target.value)} className="mb-4" />

      {fehler && <Hinweiskasten art="fehler" className="mb-4">{fehler}</Hinweiskasten>}

      <Button type="submit" disabled={laeuft}
        className="h-auto w-full cursor-pointer py-3 text-lg font-semibold">
        {texte.passwortSpeichern}
      </Button>
      <Button type="button" variant="link" onClick={beiZurueck}
        className="mt-4 h-auto w-full cursor-pointer text-sm text-schrift-gedimmt hover:text-schrift">
        {texte.zurueckZurAnmeldung}
      </Button>
    </form>
  );
}
