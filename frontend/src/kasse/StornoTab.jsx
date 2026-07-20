import { useState } from 'react';
import { apiGet, apiPost, formatEuro } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Dialog from '../komponenten/Dialog.jsx';
import { lesbareSchriftfarbe } from '../komponenten/farbe.js';

export default function StornoTab() {
  const [kaertchenListe, setKaertchenListe] = useState([]);
  const [nummernFilter, setNummernFilter] = useState('');
  const [artikelFilter, setArtikelFilter] = useState('');
  const [auswahl, setAuswahl] = useState(null);
  const [fehler, setFehler] = useState('');

  useLiveUpdate(['kaertchen'], () => {
    apiGet('/api/kasse/stornierbar').then(setKaertchenListe).catch(() => {});
  });

  const artikelNamen = [...new Set(kaertchenListe.map((k) => k.artikel_name))];
  const gefiltert = kaertchenListe.filter((k) =>
    (nummernFilter === '' || String(k.nummer).includes(nummernFilter)) &&
    (artikelFilter === '' || k.artikel_name === artikelFilter)
  );

  async function stornieren() {
    setFehler('');
    try {
      await apiPost(`/api/kasse/storno/${auswahl.id}`);
      setAuswahl(null);
    } catch (f) {
      setFehler(f.message);
      setAuswahl(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-4 flex gap-3">
        <input value={nummernFilter} onChange={(e) => setNummernFilter(e.target.value)}
          placeholder="Nummer suchen …" inputMode="numeric"
          className="w-48 rounded border border-linie bg-flaeche px-3 py-3 text-lg outline-none focus:border-blau-hell" />
        <select value={artikelFilter} onChange={(e) => setArtikelFilter(e.target.value)}
          className="rounded border border-linie bg-flaeche px-3 py-3 text-lg outline-none focus:border-blau-hell">
          <option value="">Alle Artikel</option>
          {artikelNamen.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      {fehler && <p className="mb-4 rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>}

      {gefiltert.length === 0 && (
        <p className="text-schrift-gedimmt">Keine stornierbaren Kärtchen gefunden.</p>
      )}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {gefiltert.map((kaertchen) => (
          <li key={kaertchen.id}>
            <button onClick={() => setAuswahl(kaertchen)}
              className="flex w-full items-center gap-3 rounded-lg border border-linie bg-flaeche p-3 text-left hover:bg-flaeche-hell">
              <span className="nummer rounded-lg px-3 py-2 text-2xl"
                style={{
                  backgroundColor: kaertchen.artikel_farbe,
                  color: lesbareSchriftfarbe(kaertchen.artikel_farbe),
                }}>
                {kaertchen.nummer}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg">{kaertchen.artikel_name}</span>
                <span className="block truncate text-sm text-schrift-gedimmt">
                  {kaertchen.erstellt_am.slice(11, 16)} Uhr
                  {kaertchen.beilagen.length > 0 && ` · ${kaertchen.beilagen.join(', ')}`}
                </span>
              </span>
              <span className="nummer">{formatEuro(kaertchen.preis_cent)}</span>
            </button>
          </li>
        ))}
      </ul>

      {auswahl && (
        <Dialog titel="Stornieren?" onSchliessen={() => setAuswahl(null)}>
          <p className="mb-6 text-lg">
            {auswahl.artikel_name} Nr. {auswahl.nummer} stornieren,{' '}
            <strong>{formatEuro(auswahl.preis_cent)} zurückgeben</strong> und
            Kärtchen {auswahl.nummer} einziehen?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setAuswahl(null)}
              className="flex-1 rounded-lg border border-linie py-3 text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button onClick={stornieren}
              className="flex-1 rounded-lg bg-blau py-3 text-lg font-bold text-flaeche hover:bg-blau-hell">
              Ja, stornieren
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
