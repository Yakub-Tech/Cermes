import { useState } from 'react';
import { apiPost } from '../api.js';
import Dialog from '../komponenten/Dialog.jsx';

export default function StartnummerDialog({ artikel, onFertig, onAbbrechen }) {
  const [nummerText, setNummerText] = useState(String(artikel.naechste_nummer));
  const [warnung, setWarnung] = useState(null);
  const [gelesen, setGelesen] = useState(false);
  const [fehler, setFehler] = useState('');

  async function speichern() {
    setFehler('');
    try {
      await apiPost(`/api/artikel/${artikel.id}/startnummer`, {
        naechste_nummer: Number(nummerText),
        warnung_bestaetigt: warnung !== null && gelesen,
      });
      onFertig();
    } catch (f) {
      if (f.status === 409 && f.daten.warnung) {
        setWarnung(f.daten.warnung);
        setGelesen(false);
      } else {
        setFehler(f.message);
      }
    }
  }

  return (
    <Dialog titel={`Startnummer für ${artikel.name}`} onSchliessen={onAbbrechen}>
      <label className="mb-1 block text-sm text-schrift-gedimmt">Weiter bei Nummer</label>
      <input type="number" min="1" value={nummerText} autoFocus
        onChange={(e) => { setNummerText(e.target.value); setWarnung(null); }}
        className="mb-4 w-40 rounded border border-linie bg-grund px-3 py-2 text-lg outline-none focus:border-gold" />

      {warnung && (
        <div className="mb-4 rounded-lg border border-gold bg-gold/10 px-4 py-3">
          <p className="mb-3">
            {warnung.hoechste_nummer_heute !== null
              ? `Heute wurde für diesen Artikel bereits bis Nummer ${warnung.hoechste_nummer_heute} verkauft. `
              : ''}
            Wenn du bei {nummerText} weitermachst, können zwei Kunden dieselbe
            Nummer haben und bei der Ausgabe verwechselt werden. Das ist nur dann
            richtig, wenn ihr wirklich eine neue Kärtchenrolle einsetzt.
          </p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={gelesen}
              onChange={(e) => setGelesen(e.target.checked)} />
            <span>Ich habe die Warnung gelesen und will das so.</span>
          </label>
        </div>
      )}

      {fehler && <p className="mb-4 rounded bg-rot/30 px-3 py-2 text-rot-hell">{fehler}</p>}

      <div className="flex gap-3">
        <button onClick={onAbbrechen}
          className="flex-1 rounded-lg border border-linie py-2 text-schrift-gedimmt hover:bg-flaeche-hell">
          Abbrechen
        </button>
        <button onClick={speichern} disabled={warnung !== null && !gelesen}
          className="flex-1 rounded-lg bg-rot py-2 font-bold hover:bg-rot-hell disabled:opacity-40">
          Speichern
        </button>
      </div>
    </Dialog>
  );
}
