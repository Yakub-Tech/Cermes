import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import SprachSchalter from '../komponenten/SprachSchalter.jsx';
import { useStationsSprache } from '../sprache/useStationsSprache.js';
import Fusszeile from '../komponenten/Fusszeile.jsx';
import NichtGefundenInhalt from '../komponenten/NichtGefundenInhalt.jsx';
import { useSession } from '../anmeldung/useSession.js';
import StatistikSeite from './StatistikSeite.jsx';
import ArtikelSeite from './ArtikelSeite.jsx';
import BeilagenSeite from './BeilagenSeite.jsx';
import WerbungSeite from './WerbungSeite.jsx';
import BenutzerSeite from './BenutzerSeite.jsx';
import BackupSeite from './BackupSeite.jsx';
import EinstellungenSeite from './EinstellungenSeite.jsx';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/bereiche.js';
import { de as rollenDe, tr as rollenTr } from '../sprache/rollen.js';

const bereiche = [
  ['statistik', ['admin', 'verwaltung']],
  ['artikel', ['admin', 'verwaltung']],
  ['beilagen', ['admin', 'verwaltung']],
  ['werbung', ['admin', 'verwaltung']],
  ['einstellungen', ['admin']],
  ['benutzer', ['admin']],
  ['backup', ['admin']],
];

export default function AdminLayout() {
  const session = useSession(['admin', 'verwaltung']);
  const [sprache, setSprache] = useStationsSprache();
  if (session.laedt) return null;

  const texte = sprache === 'tr' ? { ...rollenTr, ...eigeneTr } : { ...rollenDe, ...eigeneDe };
  const sichtbareBereiche = bereiche.filter(([, rollen]) => rollen.includes(session.rolle));

  return (
    <div className="flex h-screen flex-col">
      <Kopfzeile titel={texte.verwaltung} benutzername={session.benutzername} sprache={sprache}
        rechts={<SprachSchalter sprache={sprache} onWahl={setSprache} />} />

      <div className="verwaltung flex min-h-0 flex-1">
        <nav className="w-36 shrink-0 border-r border-linie bg-flaeche py-2.5">
          {sichtbareBereiche.map(([pfad]) => (
            <NavLink key={pfad} to={pfad}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm ${
                  isActive
                    ? 'border-r-2 border-navy bg-flaeche-hell font-semibold text-navy'
                    : 'text-schrift-gedimmt hover:bg-flaeche-hell'
                }`}>
              {texte[pfad]}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4">
          <Routes>
            <Route index element={<Navigate to="statistik" replace />} />
            <Route path="statistik" element={<StatistikSeite sprache={sprache} />} />
            <Route path="artikel" element={<ArtikelSeite rolle={session.rolle} sprache={sprache} />} />
            <Route path="beilagen" element={<BeilagenSeite sprache={sprache} />} />
            <Route path="werbung" element={<WerbungSeite sprache={sprache} />} />
            {session.rolle === 'admin' && (
              <>
                <Route path="einstellungen" element={<EinstellungenSeite sprache={sprache} />} />
                <Route path="benutzer" element={<BenutzerSeite sprache={sprache} />} />
                <Route path="backup" element={<BackupSeite sprache={sprache} />} />
              </>
            )}
            <Route path="*" element={<NichtGefundenInhalt sprache={sprache} />} />
          </Routes>
        </main>
      </div>

      <Fusszeile sprache={sprache} />
    </div>
  );
}
