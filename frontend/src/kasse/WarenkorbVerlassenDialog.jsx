import Dialog from '../komponenten/Dialog.jsx';
import { de, tr } from '../sprache/warenkorbVerlassenDialog.js';

export default function WarenkorbVerlassenDialog({ onVerlassen, onZurueck, sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;
  return (
    <Dialog titel={texte.titel} onSchliessen={onZurueck}>
      <p className="mb-6 text-schrift-gedimmt">
        {texte.warnung}
      </p>
      <div className="flex gap-3">
        <button onClick={onZurueck}
          className="flex-1 cursor-pointer rounded-full border border-linie py-2 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
          {texte.zurueckZurKasse}
        </button>
        <button onClick={onVerlassen}
          className="flex-1 cursor-pointer rounded-full bg-weinrot py-2 text-sm font-bold text-flaeche hover:bg-weinrot-hell">
          {texte.verwerfenUndVerlassen}
        </button>
      </div>
    </Dialog>
  );
}
