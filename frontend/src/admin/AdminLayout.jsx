import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import { useSession } from '../anmeldung/useSession.js';

export default function AdminLayout() {
  const session = useSession('admin');
  if (session.laedt) return null;

  return (
    <div>
      <Kopfzeile titel="Verwaltung" benutzername={session.benutzername} />
      <p className="p-8 text-schrift-gedimmt">Die Admin-Ansicht entsteht gerade.</p>
    </div>
  );
}
