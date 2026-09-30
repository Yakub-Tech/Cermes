import { useState } from 'react';
import DateiAuswahl from '../komponenten/DateiAuswahl.jsx';
import { apiGet, apiPut, apiDelete, apiUpload } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import LadefehlerHinweis from '../komponenten/LadefehlerHinweis.jsx';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Dialog from '../komponenten/Dialog.jsx';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/werbung.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function WerbungSeite({ sprache = 'de' }) {
  const { neueste, ladefehler } = useNeuesteAntwort(laden);
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [bilder, setBilder] = useState([]);
  const [loeschung, setLoeschung] = useState(null);
  const [fehler, setFehler] = useState('');

  function laden() {
    neueste('/api/werbung', apiGet('/api/werbung'), setBilder).catch(() => {});
  }
  useLiveUpdate(['werbung'], laden);

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
      <h2 className="mb-4 font-display text-base text-navy">{texte.titel}</h2>
      <p className="mb-2.5 text-sm text-schrift-gedimmt">
        {texte.erklaerung}
      </p>

      {ladefehler && <LadefehlerHinweis sprache={sprache} onErneut={laden} />}

      {fehler && <p className="mb-2.5 rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">{fehler}</p>}

      {bilder.length === 0 && !ladefehler && (
        <p className="mb-2.5 text-sm text-schrift-gedimmt">{texte.keineBilder}</p>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <DateiAuswahl grossflaechig akzeptiert="image/png,image/jpeg,image/webp"
          beschriftung={texte.bildHochladenBeschriftung}
          typFehlerText={texte.dateiTypFehler}
          onWahl={hochladen} sprache={sprache} />
        {bilder.map((bild) => (
          <div key={bild.id} className="kaertchen-schatten rounded-lg border border-linie bg-flaeche p-2">
            <img src={bild.url} alt={texte.bildAlt}
              className={`mb-2 h-24 w-full rounded-lg object-cover ${bild.aktiv ? '' : 'opacity-40'}`} />
            <div className="flex items-center justify-between">
              <button
                onClick={() => apiPut(`/api/werbung/${bild.id}`, { aktiv: bild.aktiv ? 0 : 1 })
                  .catch((f) => setFehler(f.message))}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold ${
                  bild.aktiv ? 'bg-navy text-grund' : 'border border-linie text-schrift-gedimmt'
                }`}>
                {bild.aktiv ? texte.aktiv : texte.inaktiv}
              </button>
              <button onClick={() => setLoeschung(bild)}
                className="cursor-pointer rounded-full border border-linie px-2 py-1 text-sm text-blau-hell hover:bg-flaeche-hell">
                {texte.entfernen}
              </button>
            </div>
          </div>
        ))}
      </div>

      {loeschung && (
        <Dialog titel={texte.bildEntfernenTitel} onSchliessen={() => setLoeschung(null)}>
          <img src={loeschung.url} alt={texte.bildAlt} className="mb-2.5 max-h-32 w-full rounded-lg object-contain" />
          <p className="mb-4 text-sm">{texte.bildWirdGeloescht}</p>
          <div className="flex gap-2">
            <button onClick={() => setLoeschung(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              {texte.abbrechen}
            </button>
            <button
              onClick={() => apiDelete(`/api/werbung/${loeschung.id}`)
                .then(() => setLoeschung(null))
                .catch((f) => { setFehler(f.message); setLoeschung(null); })}
              className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
              {texte.jaEntfernen}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
