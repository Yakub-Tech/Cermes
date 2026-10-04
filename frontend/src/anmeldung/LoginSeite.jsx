import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiPost } from '../api.js';
import { sollEnterAbsenden } from './enterAbsenden.js';
import { inaktivHinweisAbholen } from './inaktivHinweisSpeicher.js';
import PasswortAendernFormular from './PasswortAendernFormular.jsx';
import Urheberrechtshinweis from '../komponenten/Urheberrechtshinweis.jsx';
import SprachSchalter from '../komponenten/SprachSchalter.jsx';
import DesignSchalter from '../komponenten/DesignSchalter.jsx';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import NichtGefundenSeite from '../komponenten/NichtGefundenSeite.jsx';
import { Button } from '@/komponenten/ui/button';
import { Input } from '@/komponenten/ui/input';
import { Label } from '@/komponenten/ui/label';
import { useGeraeteDesign } from '../design/useGeraeteDesign.js';
import { useStationsSprache } from '../sprache/useStationsSprache.js';
import { de, tr, inaktivHinweisDe, inaktivHinweisTr } from '../sprache/login.js';
import { de as kopfzeileDe, tr as kopfzeileTr } from '../sprache/kopfzeile.js';

export default function LoginSeite() {
  const { ansicht } = useParams();
  const navigiere = useNavigate();
  const [benutzername, setBenutzername] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [passwortAendern, setPasswortAendern] = useState(false);
  const [passwortGeaendert, setPasswortGeaendert] = useState(false);
  const [abgemeldetNachMinuten, setAbgemeldetNachMinuten] = useState(null);
  const [sprache, setSprache] = useStationsSprache();
  const [design, setDesign] = useGeraeteDesign();
  const texte = sprache === 'tr' ? tr : de;
  const designTexte = sprache === 'tr' ? kopfzeileTr : kopfzeileDe;

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
    setPasswortGeaendert(false);
    try {
      const { rolle } = await apiPost('/api/login', { benutzername, passwort });
      const rolleZuPfad = { admin: '/admin', verwaltung: '/admin' };
      navigiere(rolleZuPfad[rolle] || `/${rolle}`, { replace: true });
    } catch (f) {
      setFehler(f.message);
      setLaeuft(false);
    }
  }

  function nachPasswortAenderung(name) {
    setBenutzername(name);
    setPasswort('');
    setPasswortGeaendert(true);
    setPasswortAendern(false);
  }

  if (!ansichtBekannt) return <NichtGefundenSeite />;

  return (
    <>
      <main className="anmeldung flex min-h-screen items-center justify-center p-4">
        <div
          className="relative w-full max-w-sm rounded-2xl border border-linie bg-flaeche p-8 shadow-[0_2px_8px_var(--schattenfarbe)]">
          <div className="absolute left-3 top-3">
            <SprachSchalter sprache={sprache} onWahl={setSprache} />
          </div>
          <div className="absolute right-3 top-3">
            <DesignSchalter design={design} onWahl={setDesign} texte={designTexte} />
          </div>
          <Link to="/" className="mx-auto mb-4 mt-4 block w-28 transition-opacity hover:opacity-80">
            <img src="/logo/aktuell" alt={texte.vereinslogo} className="h-28 w-28 rounded-2xl ring-1 ring-linie" />
          </Link>
          <h1 className="mb-1 text-center font-display text-3xl font-bold tracking-tight text-schrift">Cermes</h1>
          <p className="text-center text-schrift-gedimmt">{passwortAendern ? texte.passwortAendern : texte.anmeldung}</p>
          <p className="mb-6 text-center text-sm font-medium text-schrift-gedimmt">{titel}</p>

          {passwortAendern ? (
            <PasswortAendernFormular texte={texte} benutzernameVorbelegt={benutzername}
              beiErfolg={nachPasswortAenderung} beiZurueck={() => setPasswortAendern(false)} />
          ) : (
            <form onSubmit={anmelden}>
              <Label htmlFor="benutzername">{texte.benutzername}</Label>
              <Input id="benutzername" value={benutzername} autoFocus autoComplete="username"
                onChange={(e) => setBenutzername(e.target.value)} onKeyDown={beiEnterAbsenden}
                className="mb-4" />

              <Label htmlFor="passwort">{texte.passwort}</Label>
              <Input id="passwort" type="password" value={passwort} autoComplete="current-password"
                onChange={(e) => setPasswort(e.target.value)} onKeyDown={beiEnterAbsenden}
                className="mb-4" />

              {passwortGeaendert && (
                <Hinweiskasten className="mb-4">{texte.passwortGeaendert}</Hinweiskasten>
              )}

              {abgemeldetNachMinuten !== null && (
                <Hinweiskasten className="mb-4">
                  {sprache === 'tr' ? inaktivHinweisTr(abgemeldetNachMinuten) : inaktivHinweisDe(abgemeldetNachMinuten)}
                </Hinweiskasten>
              )}

              {fehler && <Hinweiskasten art="fehler" className="mb-4">{fehler}</Hinweiskasten>}

              <Button type="submit" disabled={laeuft}
                className="h-auto w-full cursor-pointer py-3 text-lg font-semibold">
                {texte.anmelden}
              </Button>
              <Button type="button" variant="link"
                onClick={() => { setPasswortAendern(true); setPasswortGeaendert(false); setFehler(''); }}
                className="mt-4 h-auto w-full cursor-pointer text-sm text-schrift-gedimmt hover:text-schrift">
                {texte.passwortAendern}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Urheberrechtshinweis />
    </>
  );
}
