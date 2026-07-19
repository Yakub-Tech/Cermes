import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import { useSession } from '../anmeldung/useSession.js';

export default function KasseSeite() {
  const session = useSession('kasse');
  if (session.laedt) return null;

  return (
    <div>
      <Kopfzeile titel="Kasse" benutzername={session.benutzername} />
      <p className="p-8 text-schrift-gedimmt">Die Kassen-Ansicht entsteht gerade.</p>
    </div>
  );
}
