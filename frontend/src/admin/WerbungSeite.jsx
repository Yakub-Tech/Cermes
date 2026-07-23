import { useRef, useState } from 'react';
import { apiGet, apiPut, apiDelete, apiUpload } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Dialog from '../komponenten/Dialog.jsx';

export default function WerbungSeite() {
  const [bilder, setBilder] = useState([]);
  const [loeschung, setLoeschung] = useState(null);
  const [fehler, setFehler] = useState('');
  const dateiFeld = useRef(null);

  useLiveUpdate(['werbung'], () => {
    apiGet('/api/werbung').then(setBilder).catch(() => {});
  });

  async function hochladen(ereignis) {
    const datei = ereignis.target.files[0];
    if (!datei) return;
    setFehler('');
    try {
      const formData = new FormData();
      formData.append('bild', datei);
      await apiUpload('/api/werbung', formData);
    } catch (f) {
      setFehler(f.message);
    }
    ereignis.target.value = '';
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl text-navy">Werbung</h2>
      <p className="mb-4 text-schrift-gedimmt">
        Aktive Bilder laufen als Karussell auf dem Fernseher. Erlaubt sind PNG,
        JPEG und WebP bis 10 MB. Änderungen wirken sofort.
      </p>

      <input ref={dateiFeld} type="file" accept="image/png,image/jpeg,image/webp"
        onChange={hochladen} className="hidden" />
      <button onClick={() => dateiFeld.current.click()}
        className="mb-6 cursor-pointer rounded-lg bg-blau px-6 py-2 font-bold text-flaeche hover:bg-blau-hell">
        Bild hochladen
      </button>

      {fehler && <p className="mb-4 rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>}

      {bilder.length === 0 && (
        <p className="text-schrift-gedimmt">Noch keine Werbebilder hochgeladen.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {bilder.map((bild) => (
          <div key={bild.id} className="rounded-xl border border-linie bg-flaeche p-3">
            <img src={bild.url} alt="Werbebild"
              className={`mb-3 h-36 w-full rounded-lg object-cover ${bild.aktiv ? '' : 'opacity-40'}`} />
            <div className="flex items-center justify-between">
              <button
                onClick={() => apiPut(`/api/werbung/${bild.id}`, { aktiv: bild.aktiv ? 0 : 1 })
                  .catch((f) => setFehler(f.message))}
                className={`cursor-pointer rounded-full px-4 py-1 text-sm font-semibold ${
                  bild.aktiv ? 'bg-navy text-grund' : 'border border-linie text-schrift-gedimmt'
                }`}>
                {bild.aktiv ? 'aktiv' : 'inaktiv'}
              </button>
              <button onClick={() => setLoeschung(bild)}
                className="cursor-pointer rounded border border-linie px-3 py-1 text-blau-hell hover:bg-flaeche-hell">
                Entfernen
              </button>
            </div>
          </div>
        ))}
      </div>

      {loeschung && (
        <Dialog titel="Werbebild entfernen?" onSchliessen={() => setLoeschung(null)}>
          <img src={loeschung.url} alt="Werbebild" className="mb-4 max-h-48 w-full rounded-lg object-contain" />
          <p className="mb-6">Das Bild wird dauerhaft gelöscht.</p>
          <div className="flex gap-3">
            <button onClick={() => setLoeschung(null)}
              className="flex-1 cursor-pointer rounded-lg border border-linie py-2 text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button
              onClick={() => apiDelete(`/api/werbung/${loeschung.id}`)
                .then(() => setLoeschung(null))
                .catch((f) => { setFehler(f.message); setLoeschung(null); })}
              className="flex-1 cursor-pointer rounded-lg bg-blau py-2 font-bold text-flaeche hover:bg-blau-hell">
              Ja, entfernen
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
