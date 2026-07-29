import { useState } from 'react';
import { apiPost } from '../api.js';
import Dialog from '../komponenten/Dialog.jsx';
import Kontrollkaestchen from '../komponenten/Kontrollkaestchen.jsx';
import Zahlenfeld from '../komponenten/Zahlenfeld.jsx';

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
      <label className="mb-1 block text-xs text-schrift-gedimmt">Weiter bei Nummer</label>
      <Zahlenfeld min="1" wert={nummerText} autoFokus klasse="mb-2.5 w-28"
        onWahl={(neuerWert) => { setNummerText(neuerWert); setWarnung(null); }} />

      {warnung && (
        <div className="mb-2.5 rounded-lg border border-akzent bg-akzent/10 px-2.5 py-2 text-sm">
          <p className="mb-2">
            {warnung.hoechste_nummer_heute !== null
              ? `Heute wurde für diesen Artikel bereits bis Nummer ${warnung.hoechste_nummer_heute} verkauft. `
              : ''}
            Wenn du bei {nummerText} weitermachst, können zwei Kunden dieselbe
            Nummer haben und bei der Ausgabe verwechselt werden. Das ist nur dann
            richtig, wenn ihr wirklich eine neue Kärtchenrolle einsetzt.
          </p>
          <label className="flex cursor-pointer items-center gap-1.5">
            <Kontrollkaestchen markiert={gelesen} onWahl={setGelesen} />
            <span>Ich habe die Warnung gelesen und will das so.</span>
          </label>
        </div>
      )}

      {fehler && <p className="mb-2.5 rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">{fehler}</p>}

      <div className="flex gap-2">
        <button onClick={onAbbrechen}
          className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
          Abbrechen
        </button>
        <button onClick={speichern} disabled={warnung !== null && !gelesen}
          className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-40">
          Speichern
        </button>
      </div>
    </Dialog>
  );
}
