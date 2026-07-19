import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../api.js';

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
    <div className="max-w-lg">
      <h2 className="mb-6 font-display text-2xl text-gold">Einstellungen</h2>
      <form onSubmit={speichern} className="rounded-xl border border-linie bg-flaeche p-6">
        <label className="mb-1 block text-schrift-gedimmt" htmlFor="warnminuten">
          Warnzeit für liegengebliebene abholbereite Kärtchen (Minuten)
        </label>
        <p className="mb-3 text-sm text-schrift-gedimmt">
          Wartet ein abholbereites Kärtchen länger als diese Zeit, wird es in der
          Ausgabe deutlich hervorgehoben.
        </p>
        <input id="warnminuten" type="number" min="0" value={warnminuten}
          onChange={(e) => setWarnminuten(e.target.value)}
          className="mb-4 w-32 rounded border border-linie bg-grund px-3 py-2 text-lg outline-none focus:border-gold" />
        {meldung && <p className="mb-3 text-gold">{meldung}</p>}
        {fehler && <p className="mb-3 rounded bg-rot/30 px-3 py-2 text-rot-hell">{fehler}</p>}
        <button type="submit"
          className="block rounded-lg bg-rot px-6 py-2 font-bold hover:bg-rot-hell">
          Speichern
        </button>
      </form>
    </div>
  );
}
