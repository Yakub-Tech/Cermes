import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import Fusszeile from '../komponenten/Fusszeile.jsx';
import { useSession } from '../anmeldung/useSession.js';
import StatistikSeite from './StatistikSeite.jsx';
import ArtikelSeite from './ArtikelSeite.jsx';
import BeilagenSeite from './BeilagenSeite.jsx';
import WerbungSeite from './WerbungSeite.jsx';
import BenutzerSeite from './BenutzerSeite.jsx';
import BackupSeite from './BackupSeite.jsx';
import EinstellungenSeite from './EinstellungenSeite.jsx';

const bereiche = [
  ['statistik', 'Statistik', ['admin', 'verwaltung']],
  ['artikel', 'Artikel', ['admin', 'verwaltung']],
  ['beilagen', 'Beilagen', ['admin', 'verwaltung']],
  ['werbung', 'Werbung', ['admin', 'verwaltung']],
  ['einstellungen', 'Einstellungen', ['admin']],
  ['benutzer', 'Benutzer', ['admin']],
  ['backup', 'Backup', ['admin']],
];

export default function AdminLayout() {
  const session = useSession(['admin', 'verwaltung']);
  if (session.laedt) return null;

  const sichtbareBereiche = bereiche.filter(([, , rollen]) => rollen.includes(session.rolle));

  return (
    <div className="flex h-screen flex-col">
      <Kopfzeile titel="Verwaltung" benutzername={session.benutzername} />

      <div className="verwaltung flex min-h-0 flex-1">
        <nav className="w-36 shrink-0 border-r border-linie bg-flaeche py-2.5">
          {sichtbareBereiche.map(([pfad, beschriftung]) => (
            <NavLink key={pfad} to={pfad}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm ${
                  isActive
                    ? 'border-r-2 border-navy bg-flaeche-hell font-semibold text-navy'
                    : 'text-schrift-gedimmt hover:bg-flaeche-hell'
                }`}>
              {beschriftung}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4">
          <Routes>
            <Route index element={<Navigate to="statistik" replace />} />
            <Route path="statistik" element={<StatistikSeite />} />
            <Route path="artikel" element={<ArtikelSeite rolle={session.rolle} />} />
            <Route path="beilagen" element={<BeilagenSeite />} />
            <Route path="werbung" element={<WerbungSeite />} />
            {session.rolle === 'admin' && (
              <>
                <Route path="einstellungen" element={<EinstellungenSeite />} />
                <Route path="benutzer" element={<BenutzerSeite />} />
                <Route path="backup" element={<BackupSeite />} />
              </>
            )}
            <Route path="*" element={<Navigate to="statistik" replace />} />
          </Routes>
        </main>
      </div>

      <Fusszeile />
    </div>
  );
}
