import Kopfzeile from './Kopfzeile.jsx';
import SprachSchalter from './SprachSchalter.jsx';
import Urheberrechtshinweis from './Urheberrechtshinweis.jsx';
import NichtGefundenInhalt from './NichtGefundenInhalt.jsx';
import { useOptionaleSession } from '../anmeldung/useOptionaleSession.js';
import { useStationsSprache } from '../sprache/useStationsSprache.js';

export default function NichtGefundenSeite() {
  const { laedt, benutzername } = useOptionaleSession();
  const [sprache, setSprache] = useStationsSprache();

  if (laedt) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Kopfzeile titel="Cermes" benutzername={benutzername} sprache={sprache}
        rechts={<SprachSchalter sprache={sprache} onWahl={setSprache} />} />
      <main className="flex flex-1 items-center justify-center">
        <NichtGefundenInhalt sprache={sprache} />
      </main>
      <Urheberrechtshinweis />
    </div>
  );
}
