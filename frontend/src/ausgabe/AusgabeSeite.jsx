import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import { useSession } from '../anmeldung/useSession.js';

export default function AusgabeSeite() {
  const session = useSession('ausgabe');
  if (session.laedt) return null;

  return (
    <div>
      <Kopfzeile titel="Ausgabe" benutzername={session.benutzername} />
      <p className="p-8 text-schrift-gedimmt">Die Ausgabe-Ansicht entsteht gerade.</p>
    </div>
  );
}
