import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../api.js';
import Zahlenfeld from '../komponenten/Zahlenfeld.jsx';

export default function EinstellungenSeite() {
  const [warnminuten, setWarnminuten] = useState('');
  const [meldung, setMeldung] = useState('');
  const [fehler, setFehler] = useState('');

  useEffect(() => {
    apiGet('/api/einstellungen')
      .then((e) => setWarnminuten(String(e.abholbereit_warnminuten)))
      .catch((f) => setFehler(f.message));
  }, []);

  async function speichern(ereignis) {
    ereignis.preventDefault();
    setMeldung('');
    setFehler('');
    try {
      await apiPut('/api/einstellungen', { abholbereit_warnminuten: Number(warnminuten) });
      setMeldung('Gespeichert.');
    } catch (f) {
      setFehler(f.message);
    }
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl text-navy">Einstellungen</h2>
      <form onSubmit={speichern} className="max-w-lg rounded-xl border border-linie bg-flaeche p-6">
        <label className="mb-1 block text-schrift-gedimmt" htmlFor="warnminuten">
          Warnzeit für liegengebliebene abholbereite Kärtchen (Minuten)
        </label>
        <p className="mb-3 text-sm text-schrift-gedimmt">
          Wartet ein abholbereites Kärtchen länger als diese Zeit, wird es in der
          Ausgabe deutlich hervorgehoben.
        </p>
        <Zahlenfeld id="warnminuten" min="0" wert={warnminuten} onWahl={setWarnminuten}
          klasse="mb-4 w-32" />
        {meldung && <p className="mb-3 text-navy">{meldung}</p>}
        {fehler && <p className="mb-3 rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>}
        <button type="submit"
          className="block cursor-pointer rounded-lg bg-blau px-6 py-2 font-bold text-flaeche hover:bg-blau-hell">
          Speichern
        </button>
      </form>
    </div>
  );
}
