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
      <h2 className="mb-4 font-display text-base text-navy">Beilagen</h2>

      <form onSubmit={anlegen} className="mb-4 flex max-w-md gap-2">
        <input value={neuerName} onChange={(e) => setNeuerName(e.target.value)}
          placeholder="Neue Beilage, z. B. Ketchup"
          className="flex-1 rounded border border-linie bg-flaeche px-2 py-1.5 outline-none focus:border-blau-hell" />
        <button type="submit" disabled={neuerName.trim() === ''}
          className="cursor-pointer rounded-full bg-blau px-4 py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-40">
          Anlegen
        </button>
      </form>

      {fehler && <p className="mb-2.5 max-w-md rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">{fehler}</p>}

      <ul className="max-w-md divide-y divide-linie rounded-lg border border-linie bg-flaeche text-sm">
        {beilagen.length === 0 && (
          <li className="px-2.5 py-4 text-schrift-gedimmt">Noch keine Beilagen angelegt.</li>
        )}
        {beilagen.map((beilage) => (
          <li key={beilage.id} className="flex items-center gap-2.5 px-2.5 py-2">
            <span className={`flex-1 text-sm ${beilage.aktiv ? '' : 'text-schrift-gedimmt line-through'}`}>
              {beilage.name}
            </span>
            <button
              onClick={() => apiPut(`/api/beilagen/${beilage.id}`, {
                name: beilage.name, aktiv: beilage.aktiv ? 0 : 1,
              }).catch((f) => setFehler(f.message))}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold ${
                beilage.aktiv ? 'bg-navy text-grund' : 'border border-linie text-schrift-gedimmt'
              }`}>
              {beilage.aktiv ? 'aktiv' : 'inaktiv'}
            </button>
            <button onClick={() => setBearbeitung({ ...beilage })}
              className="cursor-pointer rounded-full border border-linie px-2 py-1 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              Umbenennen
            </button>
            <button onClick={() => setLoeschung(beilage)}
              className="cursor-pointer rounded-full border border-linie px-2 py-1 text-sm text-blau-hell hover:bg-flaeche-hell">
              Löschen
            </button>
          </li>
        ))}
      </ul>

      {bearbeitung && (
        <Dialog titel="Beilage umbenennen" onSchliessen={() => setBearbeitung(null)}>
          <input value={bearbeitung.name} autoFocus
            onChange={(e) => setBearbeitung({ ...bearbeitung, name: e.target.value })}
            className="mb-2.5 w-full rounded border border-linie bg-grund px-2 py-1.5 text-sm outline-none focus:border-blau-hell" />
          <div className="flex gap-2">
            <button onClick={() => setBearbeitung(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button onClick={speichern}
              className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
              Speichern
            </button>
          </div>
        </Dialog>
      )}

      {loeschung && (
        <Dialog titel="Beilage löschen?" onSchliessen={() => setLoeschung(null)}>
          <p className="mb-4 text-sm">
            „{loeschung.name}“ wird dauerhaft aus jeder Auswahl entfernt.
            Bereits verkaufte Kärtchen bleiben unverändert.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setLoeschung(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button
              onClick={() => apiDelete(`/api/beilagen/${loeschung.id}`)
                .then(() => setLoeschung(null))
                .catch((f) => { setFehler(f.message); setLoeschung(null); })}
              className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
              Ja, löschen
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
