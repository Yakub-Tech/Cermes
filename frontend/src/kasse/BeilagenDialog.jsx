import { useState } from 'react';
import Dialog from '../komponenten/Dialog.jsx';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/beilagenDialog.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function BeilagenDialog({ artikel, onBestaetigen, onAbbrechen, onAuswahlAendern, sprache }) {
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [gewaehlt, setGewaehlt] = useState([]);
  const [sonderwunschAktiv, setSonderwunschAktiv] = useState(false);
  const [sonderwunsch, setSonderwunsch] = useState('');

  function umschalten(beilage) {
    const neueAuswahl = gewaehlt.some((b) => b.id === beilage.id)
      ? gewaehlt.filter((b) => b.id !== beilage.id)
      : [...gewaehlt, beilage];
    setGewaehlt(neueAuswahl);
    onAuswahlAendern?.(neueAuswahl);
  }

  const beilagenSortiert = [...artikel.beilagen].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const titelZusatz = artikel.beilagen.length > 0 ? texte.beilagenWaehlen : texte.sonderwunsch;

  return (
    <Dialog titel={`${zweisprachigerName(artikel.name, artikel.name_tr, sprache)}: ${titelZusatz}`} onSchliessen={onAbbrechen}>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {beilagenSortiert.map((beilage) => {
          const aktivGewaehlt = gewaehlt.some((b) => b.id === beilage.id);
          if (!beilage.aktiv) {
            return (
              <div key={beilage.id}
                className="cursor-not-allowed rounded-full border border-linie px-4 py-4 text-center text-schrift-gedimmt opacity-40">
                {zweisprachigerName(beilage.name, beilage.name_tr, sprache)}
                <span className="block text-xs">{texte.nichtVerfuegbar}</span>
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
              {zweisprachigerName(beilage.name, beilage.name_tr, sprache)}
            </button>
          );
        })}
        <button onClick={() => setSonderwunschAktiv(!sonderwunschAktiv)}
          className={`col-span-2 cursor-pointer rounded-full border px-4 py-4 text-center text-lg ${
            sonderwunschAktiv
              ? 'border-navy bg-navy text-grund font-bold'
              : 'border-dashed border-linie bg-grund hover:bg-flaeche-hell'
          }`}>
          {texte.sonderwunsch}
        </button>
      </div>
      {sonderwunschAktiv && (
        <input type="text" value={sonderwunsch} maxLength={100} autoFocus
          onChange={(ereignis) => setSonderwunsch(ereignis.target.value)}
          placeholder={texte.sonderwunschBeispiel} aria-label={texte.sonderwunsch}
          className="mb-6 w-full rounded-full border border-linie bg-grund px-4 py-3 text-lg" />
      )}
      <div className="flex gap-3">
        <button onClick={onAbbrechen}
          className="flex-1 cursor-pointer rounded-full border border-linie py-3 text-schrift-gedimmt hover:bg-flaeche-hell">
          {texte.abbrechen}
        </button>
        <button onClick={() => onBestaetigen(gewaehlt, sonderwunschAktiv ? sonderwunsch.trim() : '')}
          className="flex-1 cursor-pointer rounded-full bg-blau py-3 text-lg font-bold text-flaeche hover:bg-blau-hell">
          {texte.inDenWarenkorb}
        </button>
      </div>
    </Dialog>
  );
}
