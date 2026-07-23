import { useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Dialog from '../komponenten/Dialog.jsx';

export default function BeilagenSeite() {
  const [beilagen, setBeilagen] = useState([]);
  const [neuerName, setNeuerName] = useState('');
  const [bearbeitung, setBearbeitung] = useState(null);
  const [loeschung, setLoeschung] = useState(null);
  const [fehler, setFehler] = useState('');

  useLiveUpdate(['beilagen'], () => {
    apiGet('/api/beilagen').then(setBeilagen).catch(() => {});
  });

  async function anlegen(ereignis) {
    ereignis.preventDefault();
    setFehler('');
    try {
      await apiPost('/api/beilagen', { name: neuerName });
      setNeuerName('');
    } catch (f) {
      setFehler(f.message);
    }
  }

  async function speichern() {
    setFehler('');
    try {
      await apiPut(`/api/beilagen/${bearbeitung.id}`, {
        name: bearbeitung.name, aktiv: bearbeitung.aktiv,
      });
      setBearbeitung(null);
    } catch (f) {
      setFehler(f.message);
    }
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl text-navy">Beilagen</h2>

      <form onSubmit={anlegen} className="mb-6 flex max-w-2xl gap-3">
        <input value={neuerName} onChange={(e) => setNeuerName(e.target.value)}
          placeholder="Neue Beilage, z. B. Ketchup"
          className="flex-1 rounded border border-linie bg-flaeche px-3 py-2 outline-none focus:border-blau-hell" />
        <button type="submit" disabled={neuerName.trim() === ''}
          className="cursor-pointer rounded-lg bg-blau px-6 py-2 font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-40">
          Anlegen
        </button>
      </form>

      {fehler && <p className="mb-4 max-w-2xl rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>}

      <ul className="max-w-2xl divide-y divide-linie rounded-xl border border-linie bg-flaeche">
        {beilagen.length === 0 && (
          <li className="px-4 py-6 text-schrift-gedimmt">Noch keine Beilagen angelegt.</li>
        )}
        {beilagen.map((beilage) => (
          <li key={beilage.id} className="flex items-center gap-4 px-4 py-3">
            <span className={`flex-1 text-lg ${beilage.aktiv ? '' : 'text-schrift-gedimmt line-through'}`}>
              {beilage.name}
            </span>
            <button
              onClick={() => apiPut(`/api/beilagen/${beilage.id}`, {
                name: beilage.name, aktiv: beilage.aktiv ? 0 : 1,
              }).catch((f) => setFehler(f.message))}
              className={`cursor-pointer rounded-full px-4 py-1 text-sm font-semibold ${
                beilage.aktiv ? 'bg-navy text-grund' : 'border border-linie text-schrift-gedimmt'
              }`}>
              {beilage.aktiv ? 'aktiv' : 'inaktiv'}
            </button>
            <button onClick={() => setBearbeitung({ ...beilage })}
              className="cursor-pointer rounded border border-linie px-3 py-1 text-schrift-gedimmt hover:bg-flaeche-hell">
              Umbenennen
            </button>
            <button onClick={() => setLoeschung(beilage)}
              className="cursor-pointer rounded border border-linie px-3 py-1 text-blau-hell hover:bg-flaeche-hell">
              Löschen
            </button>
          </li>
        ))}
      </ul>

      {bearbeitung && (
        <Dialog titel="Beilage umbenennen" onSchliessen={() => setBearbeitung(null)}>
          <input value={bearbeitung.name} autoFocus
            onChange={(e) => setBearbeitung({ ...bearbeitung, name: e.target.value })}
            className="mb-4 w-full rounded border border-linie bg-grund px-3 py-2 text-lg outline-none focus:border-blau-hell" />
          <div className="flex gap-3">
            <button onClick={() => setBearbeitung(null)}
              className="flex-1 cursor-pointer rounded-lg border border-linie py-2 text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button onClick={speichern}
              className="flex-1 cursor-pointer rounded-lg bg-blau py-2 font-bold text-flaeche hover:bg-blau-hell">
              Speichern
            </button>
          </div>
        </Dialog>
      )}

      {loeschung && (
        <Dialog titel="Beilage löschen?" onSchliessen={() => setLoeschung(null)}>
          <p className="mb-6">
            „{loeschung.name}“ wird dauerhaft aus jeder Auswahl entfernt.
            Bereits verkaufte Kärtchen bleiben unverändert.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setLoeschung(null)}
              className="flex-1 cursor-pointer rounded-lg border border-linie py-2 text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button
              onClick={() => apiDelete(`/api/beilagen/${loeschung.id}`)
                .then(() => setLoeschung(null))
                .catch((f) => { setFehler(f.message); setLoeschung(null); })}
              className="flex-1 cursor-pointer rounded-lg bg-blau py-2 font-bold text-flaeche hover:bg-blau-hell">
              Ja, löschen
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
