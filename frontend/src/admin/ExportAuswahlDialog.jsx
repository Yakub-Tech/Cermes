import { useState } from 'react';
import Dialog from '../komponenten/Dialog.jsx';
import Kontrollkaestchen from '../komponenten/Kontrollkaestchen.jsx';
import { exportModellBauen, alleAuswahlIds } from './statistikExportModell.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/statistikExport.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function ExportAuswahlDialog({ art, eingabe, sprache = 'de', onHerunterladen, onSchliessen }) {
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [gruppen] = useState(() => exportModellBauen(eingabe).auswahlGruppen);
  const [gewaehlt, setGewaehlt] = useState(() => gruppen.flatMap((g) => g.eintraege.map((e) => e.id)));
  const nichtsGewaehlt = gewaehlt.length === 0;

  function umschalten(id, markiert) {
    if (markiert) {
      setGewaehlt([...gewaehlt, id]);
    } else {
      setGewaehlt(gewaehlt.filter((gewaehlteId) => gewaehlteId !== id));
    }
  }

  return (
    <Dialog titel={art === 'excel' ? texte.dialogTitelExcel : texte.dialogTitelPdf}
      onSchliessen={onSchliessen} breite="max-w-lg">
      <p className="mb-2 text-sm text-schrift-gedimmt">{texte.dialogFrage}</p>
      <div className="mb-3 max-h-[64vh] space-y-2 overflow-y-auto">
        {gruppen.map((gruppe) => (
          <fieldset key={gruppe.titel} className="rounded-lg border border-linie px-3 pb-1 pt-1.5">
            <legend className="px-1 text-sm font-bold text-navy">{gruppe.titel}</legend>
            <div className="grid grid-cols-2">
              {gruppe.eintraege.map((eintrag) => (
                <label key={eintrag.id} className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-base">
                  <Kontrollkaestchen markiert={gewaehlt.includes(eintrag.id)} groesse="h-[22px] w-[22px]" rand="border-schrift-gedimmt"
                    onWahl={(markiert) => umschalten(eintrag.id, markiert)} />
                  <span>{eintrag.beschriftung}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {nichtsGewaehlt && <p role="status" className="mb-2 text-sm text-weinrot">{texte.nichtsGewaehlt}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onSchliessen}
          className="min-h-[44px] flex-1 cursor-pointer rounded-full border border-linie text-base text-schrift-gedimmt hover:bg-flaeche-hell">
          {texte.abbrechen}
        </button>
        <button type="button" onClick={() => onHerunterladen(gewaehlt)} disabled={nichtsGewaehlt}
          className="min-h-[44px] flex-1 cursor-pointer rounded-full bg-blau text-base font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-40">
          {texte.herunterladen}
        </button>
      </div>
    </Dialog>
  );
}
