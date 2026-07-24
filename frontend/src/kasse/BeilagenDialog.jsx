import { useState } from 'react';
import Dialog from '../komponenten/Dialog.jsx';

export default function BeilagenDialog({ artikel, onBestaetigen, onAbbrechen }) {
  const [gewaehlt, setGewaehlt] = useState([]);

  function umschalten(beilage) {
    if (gewaehlt.some((b) => b.id === beilage.id)) {
      setGewaehlt(gewaehlt.filter((b) => b.id !== beilage.id));
    } else {
      setGewaehlt([...gewaehlt, beilage]);
    }
  }

  const beilagenSortiert = [...artikel.beilagen].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return (
    <Dialog titel={`${artikel.name}: Beilagen wählen`} onSchliessen={onAbbrechen}>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {beilagenSortiert.map((beilage) => {
          const aktivGewaehlt = gewaehlt.some((b) => b.id === beilage.id);
          if (!beilage.aktiv) {
            return (
              <div key={beilage.id}
                className="cursor-not-allowed rounded-full border border-linie px-4 py-4 text-center text-schrift-gedimmt opacity-40">
                {beilage.name}
                <span className="block text-xs">gerade nicht verfügbar</span>
              </div>
            );
          }
          return (
            <button key={beilage.id} onClick={() => umschalten(beilage)}
              className={`cursor-pointer rounded-full border px-4 py-4 text-center text-lg ${
                aktivGewaehlt
                  ? 'border-navy bg-navy text-grund font-bold'
                  : 'border-linie bg-grund hover:bg-flaeche-hell'
              }`}>
              {beilage.name}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3">
        <button onClick={onAbbrechen}
          className="flex-1 cursor-pointer rounded-full border border-linie py-3 text-schrift-gedimmt hover:bg-flaeche-hell">
          Abbrechen
        </button>
        <button onClick={() => onBestaetigen(gewaehlt)}
          className="flex-1 cursor-pointer rounded-full bg-blau py-3 text-lg font-bold text-flaeche hover:bg-blau-hell">
          In den Warenkorb
        </button>
      </div>
    </Dialog>
  );
}
