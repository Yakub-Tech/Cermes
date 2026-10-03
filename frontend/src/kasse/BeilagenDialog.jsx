import { useState } from 'react';
import Dialog from '../komponenten/Dialog.jsx';
import { Input } from '@/komponenten/ui/input';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/beilagenDialog.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';
import { KNOPF_NEBEN, KNOPF_HAUPT } from './knopfKlassen.js';

const WAHL_KNOPF = 'cursor-pointer rounded-lg border px-4 py-4 text-center text-lg';
const WAHL_AN = 'border-transparent bg-haupt font-bold text-haupt-text';
const WAHL_AUS = 'border-schrift-gedimmt/35 bg-flaeche-hell text-schrift hover:border-schrift-gedimmt';

export default function BeilagenDialog({ artikel, onBestaetigen, onAbbrechen, onAuswahlAendern, sprache }) {
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [gewaehlt, setGewaehlt] = useState([]);
  const [sonderwunschAktiv, setSonderwunschAktiv] = useState(artikel.beilagen.length === 0);
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
                className="cursor-not-allowed rounded-lg border border-linie px-4 py-4 text-center text-schrift-gedimmt opacity-40">
                {zweisprachigerName(beilage.name, beilage.name_tr, sprache)}
                <span className="block text-xs">{texte.nichtVerfuegbar}</span>
              </div>
            );
          }
          return (
            <button key={beilage.id} onClick={() => umschalten(beilage)}
              className={`${WAHL_KNOPF} ${aktivGewaehlt ? WAHL_AN : WAHL_AUS}`}>
              {zweisprachigerName(beilage.name, beilage.name_tr, sprache)}
            </button>
          );
        })}
        {artikel.beilagen.length > 0 && (
          <button onClick={() => setSonderwunschAktiv(!sonderwunschAktiv)}
            className={`${WAHL_KNOPF} col-span-2 ${sonderwunschAktiv ? WAHL_AN : `${WAHL_AUS} border-dashed`}`}>
            {texte.sonderwunsch}
          </button>
        )}
      </div>
      {sonderwunschAktiv && (
        <Input type="text" value={sonderwunsch} maxLength={100} autoFocus
          onChange={(ereignis) => setSonderwunsch(ereignis.target.value)}
          placeholder={texte.sonderwunschBeispiel} aria-label={texte.sonderwunsch}
          className="mb-6" />
      )}
      <div className="flex gap-3">
        <button onClick={onAbbrechen}
          className={`${KNOPF_NEBEN} flex-1 py-3 text-schrift-gedimmt`}>
          {texte.abbrechen}
        </button>
        <button onClick={() => onBestaetigen(gewaehlt, sonderwunschAktiv ? sonderwunsch.trim() : '')}
          className={`${KNOPF_HAUPT} flex-1 py-3 text-lg font-bold`}>
          {texte.inDenWarenkorb}
        </button>
      </div>
    </Dialog>
  );
}
