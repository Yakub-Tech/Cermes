import Kopfzeile from '../komponenten/Kopfzeile.jsx';
import ZielKaertchen from './ZielKaertchen.jsx';
import { ZIELE } from './ziele.js';

export default function StartSeite() {
  return (
    <div className="flex min-h-screen flex-col">
      <Kopfzeile titel="Cermes" />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {ZIELE.map((ziel) => (
            <ZielKaertchen key={ziel.pfad} label={ziel.label} Icon={ziel.Icon} pfad={ziel.pfad} />
          ))}
        </div>
      </main>
    </div>
  );
}
