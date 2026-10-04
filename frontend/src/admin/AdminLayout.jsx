import { Fragment } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import {
  ChartColumn, Package, ListPlus, Image as Bild, SlidersHorizontal, Users, Database, ScrollText,
} from 'lucide-react';
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
import AuditSeite from './AuditSeite.jsx';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/bereiche.js';
import { de as rollenDe, tr as rollenTr } from '../sprache/rollen.js';

const bereiche = [
  { pfad: 'statistik', rollen: ['admin', 'verwaltung'], Icon: ChartColumn },
  { pfad: 'artikel', rollen: ['admin', 'verwaltung'], Icon: Package },
  { pfad: 'beilagen', rollen: ['admin', 'verwaltung'], Icon: ListPlus },
  { pfad: 'werbung', rollen: ['admin', 'verwaltung'], Icon: Bild },
  { pfad: 'einstellungen', rollen: ['admin'], Icon: SlidersHorizontal },
  { pfad: 'benutzer', rollen: ['admin'], Icon: Users },
  { pfad: 'backup', rollen: ['admin'], Icon: Database },
  { pfad: 'audit', rollen: ['admin'], Icon: ScrollText },
];

export default function AdminLayout() {
  const session = useSession(['admin', 'verwaltung']);
  const [sprache, setSprache] = useStationsSprache();
  if (session.laedt) return null;

  const texte = sprache === 'tr' ? { ...rollenTr, ...eigeneTr } : { ...rollenDe, ...eigeneDe };
  const sichtbareBereiche = bereiche.filter((bereich) => bereich.rollen.includes(session.rolle));

  return (
    <div className="flex h-screen flex-col">
      <Kopfzeile titel={texte.verwaltung} benutzername={session.benutzername} sprache={sprache}
        rechts={<SprachSchalter sprache={sprache} onWahl={setSprache} />} />

      <div className="verwaltung flex min-h-0 flex-1">
        <nav className="flex w-36 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-linie bg-flaeche p-2">
          {sichtbareBereiche.map(({ pfad, Icon }) => (
            <Fragment key={pfad}>
              {pfad === 'einstellungen' && <div className="mx-1 my-1.5 h-px bg-linie" />}
              <NavLink to={pfad}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
                    isActive
                      ? 'bg-flaeche-hell font-semibold text-schrift'
                      : 'text-schrift-gedimmt hover:bg-flaeche-hell hover:text-schrift'
                  }`}>
                <Icon className="size-4 shrink-0" />
                {texte[pfad]}
              </NavLink>
            </Fragment>
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
                <Route path="audit" element={<AuditSeite sprache={sprache} />} />
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
