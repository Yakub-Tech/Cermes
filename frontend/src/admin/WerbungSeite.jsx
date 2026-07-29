import { useState } from 'react';
import DateiAuswahl from '../komponenten/DateiAuswahl.jsx';
import { apiGet, apiPut, apiDelete, apiUpload } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Dialog from '../komponenten/Dialog.jsx';

export default function WerbungSeite() {
  const [bilder, setBilder] = useState([]);
  const [loeschung, setLoeschung] = useState(null);
  const [fehler, setFehler] = useState('');

  useLiveUpdate(['werbung'], () => {
    apiGet('/api/werbung').then(setBilder).catch(() => {});
  });

  async function hochladen(datei) {
    if (!datei) return;
    setFehler('');
    try {
      const formData = new FormData();
      formData.append('bild', datei);
      await apiUpload('/api/werbung', formData);
    } catch (f) {
      setFehler(f.message);
    }
  }

  return (
    <div>
      <h2 className="mb-4 font-display text-base text-navy">Werbung</h2>
      <p className="mb-2.5 text-sm text-schrift-gedimmt">
        Aktive Bilder laufen als Karussell auf dem Fernseher. Erlaubt sind PNG,
        JPEG und WebP bis 10 MB. Änderungen wirken sofort.
      </p>

      {fehler && <p className="mb-2.5 rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">{fehler}</p>}

      {bilder.length === 0 && (
        <p className="mb-2.5 text-sm text-schrift-gedimmt">Noch keine Werbebilder hochgeladen.</p>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <DateiAuswahl grossflaechig akzeptiert="image/png,image/jpeg,image/webp"
          beschriftung="Bild hochladen"
          typFehlerText="Bitte nur PNG-, JPEG- oder WebP-Bilder ablegen."
          onWahl={hochladen} />
        {bilder.map((bild) => (
          <div key={bild.id} className="rounded-lg border border-linie bg-flaeche p-2">
            <img src={bild.url} alt="Werbebild"
              className={`mb-2 h-24 w-full rounded-lg object-cover ${bild.aktiv ? '' : 'opacity-40'}`} />
            <div className="flex items-center justify-between">
              <button
                onClick={() => apiPut(`/api/werbung/${bild.id}`, { aktiv: bild.aktiv ? 0 : 1 })
                  .catch((f) => setFehler(f.message))}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold ${
                  bild.aktiv ? 'bg-navy text-grund' : 'border border-linie text-schrift-gedimmt'
                }`}>
                {bild.aktiv ? 'aktiv' : 'inaktiv'}
              </button>
              <button onClick={() => setLoeschung(bild)}
                className="cursor-pointer rounded-full border border-linie px-2 py-1 text-sm text-blau-hell hover:bg-flaeche-hell">
                Entfernen
              </button>
            </div>
          </div>
        ))}
      </div>

      {loeschung && (
        <Dialog titel="Werbebild entfernen?" onSchliessen={() => setLoeschung(null)}>
          <img src={loeschung.url} alt="Werbebild" className="mb-2.5 max-h-32 w-full rounded-lg object-contain" />
          <p className="mb-4 text-sm">Das Bild wird dauerhaft gelöscht.</p>
          <div className="flex gap-2">
            <button onClick={() => setLoeschung(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button
              onClick={() => apiDelete(`/api/werbung/${loeschung.id}`)
                .then(() => setLoeschung(null))
                .catch((f) => { setFehler(f.message); setLoeschung(null); })}
              className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
              Ja, entfernen
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
