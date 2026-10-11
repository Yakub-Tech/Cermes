import Dialog from '../komponenten/Dialog.jsx';
import { de, tr } from '../sprache/warenkorbVerlassenDialog.js';
import { KNOPF_NEBEN, KNOPF_GEFAHR } from './knopfKlassen.js';

export default function WarenkorbVerlassenDialog({ onVerlassen, onZurueck, sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;
  return (
    <Dialog titel={texte.titel} onSchliessen={onZurueck}>
      <p className="mb-6 text-schrift-gedimmt">
        {texte.warnung}
      </p>
      <div className="flex gap-3">
        <button onClick={onZurueck}
          className={`${KNOPF_NEBEN} flex-1 py-2 text-sm text-schrift-gedimmt`}>
          {texte.zurueckZurKasse}
        </button>
        <button onClick={onVerlassen}
          className={`${KNOPF_GEFAHR} flex-1 py-2 text-sm font-bold`}>
          {texte.verwerfenUndVerlassen}
        </button>
      </div>
    </Dialog>
  );
}
