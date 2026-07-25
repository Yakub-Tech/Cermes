import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import ZielKaertchen from './ZielKaertchen.jsx';
import { ZIELE } from './ziele.js';
import { useOptionaleSession } from '../anmeldung/useOptionaleSession.js';
import NetzwerkAdresse from './NetzwerkAdresse.jsx';

export default function StartSeite() {
  const { laedt, benutzername } = useOptionaleSession();

  if (laedt) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Kopfzeile titel="Cermes" benutzername={benutzername} />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {ZIELE.map((ziel) => (
            <ZielKaertchen key={ziel.pfad} beschriftung={ziel.beschriftung} Icon={ziel.Icon} pfad={ziel.pfad} />
          ))}
        </div>
      </main>
      <NetzwerkAdresse />
    </div>
  );
}
