import { useState } from 'react';
import { euroZuCent, formatEuro } from '../api.js';
import Dialog from '../komponenten/Dialog.jsx';
import Zahlenfeld from '../komponenten/Zahlenfeld.jsx';

const NAME_MAX_LAENGE = 24;

export default function ArtikelFormular({ artikel, beilagen, rolle, onSpeichern, onAbbrechen }) {
  const [name, setName] = useState(artikel?.name ?? '');
  const [farbe, setFarbe] = useState(artikel?.farbe ?? '#b53030');
  const [preisText, setPreisText] = useState(
    artikel ? formatEuro(artikel.preis_cent).replace(' €', '') : ''
  );
  const [kostenText, setKostenText] = useState(
    artikel?.einkaufskosten_cent != null
      ? formatEuro(artikel.einkaufskosten_cent).replace(' €', '') : ''
  );
  const [sortierung, setSortierung] = useState(artikel?.sortierung ?? 0);
  const [beilagenIds, setBeilagenIds] = useState(artikel?.beilagen_ids ?? []);
  const [fehler, setFehler] = useState('');

  function beilageUmschalten(id) {
    setBeilagenIds(beilagenIds.includes(id)
      ? beilagenIds.filter((b) => b !== id)
      : [...beilagenIds, id]);
  }

  function speichern() {
    const preisCent = euroZuCent(preisText);
    if (preisCent === null) {
      setFehler('Bitte einen gültigen Verkaufspreis eingeben, z. B. 3,50');
      return;
    }
    let kostenCent = null;
    if (kostenText.trim() !== '') {
      kostenCent = euroZuCent(kostenText);
      if (kostenCent === null) {
        setFehler('Bitte gültige Einkaufskosten eingeben oder das Feld leer lassen.');
        return;
      }
    }
    onSpeichern({
      name,
      farbe,
      preis_cent: preisCent,
      einkaufskosten_cent: kostenCent,
      sortierung: Number(sortierung) || 0,
      aktiv: artikel?.aktiv ?? 1,
      beilagen_ids: beilagenIds,
    }).catch((f) => setFehler(f.message));
  }

  const eingabeKlasse =
    'mb-2.5 w-full rounded border border-linie bg-grund px-2 py-1.5 text-sm outline-none focus:border-blau-hell';

  return (
    <Dialog titel={artikel ? `${artikel.name} bearbeiten` : 'Artikel anlegen'}
      onSchliessen={onAbbrechen}>
      <label className="mb-1 block text-xs text-schrift-gedimmt">Name</label>
      <input value={name} autoFocus maxLength={NAME_MAX_LAENGE} onChange={(e) => setName(e.target.value)}
        className={eingabeKlasse.replace('mb-2.5', 'mb-1')} />
      <p className="mb-2.5 text-right text-xs text-schrift-gedimmt">
        {name.length}/{NAME_MAX_LAENGE} Zeichen
      </p>

      <div className="flex gap-2.5">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-schrift-gedimmt">Verkaufspreis (€)</label>
          <input value={preisText} inputMode="decimal" placeholder="3,50"
            onChange={(e) => setPreisText(e.target.value)} className={eingabeKlasse} />
        </div>
        {rolle === 'admin' && (
          <div className="flex-1">
            <label className="mb-1 block text-xs text-schrift-gedimmt">Einkaufskosten (€, optional)</label>
            <input value={kostenText} inputMode="decimal" placeholder="leer = ohne Angabe"
              onChange={(e) => setKostenText(e.target.value)} className={eingabeKlasse} />
          </div>
        )}
      </div>

      <div className="mb-2.5 flex items-center gap-2.5">
        <div>
          <label className="mb-1 block text-xs text-schrift-gedimmt">Kärtchenfarbe</label>
          <input type="color" value={farbe} onChange={(e) => setFarbe(e.target.value)}
            className="h-8 w-14 cursor-pointer rounded border border-linie bg-grund" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-schrift-gedimmt">Sortierung in der Kasse</label>
          <Zahlenfeld wert={sortierung} onWahl={setSortierung} klasse="w-16" />
        </div>
      </div>

      <label className="mb-1 block text-xs text-schrift-gedimmt">Beilagen</label>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {beilagen.length === 0 && (
          <p className="text-xs text-schrift-gedimmt">
            Noch keine Beilagen angelegt (Bereich „Beilagen“).
          </p>
        )}
        {beilagen.map((beilage) => (
          <button key={beilage.id} type="button" onClick={() => beilageUmschalten(beilage.id)}
            className={`cursor-pointer rounded-full px-2.5 py-1 text-sm ${
              beilagenIds.includes(beilage.id)
                ? 'bg-navy font-semibold text-grund'
                : 'border border-linie text-schrift-gedimmt hover:bg-flaeche-hell'
            }`}>
            {beilage.name}
          </button>
        ))}
      </div>

      {fehler && <p className="mb-2.5 rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">{fehler}</p>}

      <div className="flex gap-2">
        <button onClick={onAbbrechen}
          className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
          Abbrechen
        </button>
        <button onClick={speichern}
          className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
          Speichern
        </button>
      </div>
    </Dialog>
  );
}
