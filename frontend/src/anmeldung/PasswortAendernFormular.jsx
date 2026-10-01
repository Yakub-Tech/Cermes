import { useState } from 'react';
import { apiPost } from '../api.js';

const FELD = 'mb-4 w-full rounded border border-linie bg-grund px-3 py-3 text-lg outline-none focus:border-blau-hell';
const BESCHRIFTUNG = 'mb-1 block text-sm text-schrift-gedimmt';

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
      <label className={BESCHRIFTUNG} htmlFor="pw-benutzername">{texte.benutzername}</label>
      <input id="pw-benutzername" value={benutzername} autoFocus autoComplete="username"
        onChange={(e) => setBenutzername(e.target.value)} className={FELD} />

      <label className={BESCHRIFTUNG} htmlFor="pw-aktuell">{texte.aktuellesPasswort}</label>
      <input id="pw-aktuell" type="password" value={aktuell} autoComplete="current-password"
        onChange={(e) => setAktuell(e.target.value)} className={FELD} />

      <label className={BESCHRIFTUNG} htmlFor="pw-neu">{texte.neuesPasswort}</label>
      <input id="pw-neu" type="password" value={neu} autoComplete="new-password"
        onChange={(e) => setNeu(e.target.value)} className={FELD} />

      <label className={BESCHRIFTUNG} htmlFor="pw-wiederholt">{texte.neuesPasswortWiederholen}</label>
      <input id="pw-wiederholt" type="password" value={wiederholt} autoComplete="new-password"
        onChange={(e) => setWiederholt(e.target.value)} className={FELD} />

      {fehler && <p className="mb-4 rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>}

      <button type="submit" disabled={laeuft}
        className="w-full cursor-pointer rounded-full bg-blau py-3 text-lg font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-50">
        {texte.passwortSpeichern}
      </button>
      <button type="button" onClick={beiZurueck}
        className="mt-4 block w-full cursor-pointer text-center text-sm text-schrift-gedimmt underline hover:text-navy">
        {texte.zurueckZurAnmeldung}
      </button>
    </form>
  );
}
