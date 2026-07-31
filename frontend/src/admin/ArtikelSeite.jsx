import { useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, formatEuro } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Dialog from '../komponenten/Dialog.jsx';
import ArtikelFormular from './ArtikelFormular.jsx';
import StartnummerDialog from './StartnummerDialog.jsx';

export default function ArtikelSeite({ rolle }) {
  const [artikelListe, setArtikelListe] = useState([]);
  const [beilagen, setBeilagen] = useState([]);
  const [formular, setFormular] = useState(null);
  const [startnummer, setStartnummer] = useState(null);
  const [loeschung, setLoeschung] = useState(null);
  const [fehler, setFehler] = useState('');

  useLiveUpdate(['artikel', 'beilagen', 'kaertchen'], () => {
    apiGet('/api/artikel').then(setArtikelListe).catch(() => {});
    apiGet('/api/beilagen').then(setBeilagen).catch(() => {});
  });

  function beilagenNamen(ids) {
    return beilagen.filter((b) => ids.includes(b.id)).map((b) => b.name).join(', ');
  }

  async function speichern(daten) {
    if (formular.artikel) {
      await apiPut(`/api/artikel/${formular.artikel.id}`, daten);
    } else {
      await apiPost('/api/artikel', daten);
    }
    setFormular(null);
  }

  return (
    <div>
      <h2 className="mb-4 font-display text-base text-navy">Artikel</h2>

      <button onClick={() => setFormular({ artikel: null })}
        className="kaertchen-schatten mb-4 cursor-pointer rounded-full bg-blau px-4 py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
        Artikel anlegen
      </button>

      {fehler && <p className="mb-2.5 rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">{fehler}</p>}

      <div className="kaertchen-schatten overflow-x-auto rounded-lg border border-linie bg-flaeche">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-linie text-xs text-schrift-gedimmt">
              <th className="px-2.5 py-2">Artikel</th>
              <th className="px-2.5 py-2">Preis</th>
              {rolle === 'admin' && <th className="px-2.5 py-2">Kosten</th>}
              <th className="px-2.5 py-2">Beilagen</th>
              <th className="px-2.5 py-2">Weiter bei Nr.</th>
              <th className="px-2.5 py-2">Aktiv</th>
              <th className="px-2.5 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linie text-sm">
            {artikelListe.length === 0 && (
              <tr><td colSpan={rolle === 'admin' ? 7 : 6} className="px-2.5 py-4 text-schrift-gedimmt">
                Noch keine Artikel angelegt.
              </td></tr>
            )}
            {artikelListe.map((artikel) => (
              <tr key={artikel.id} className={artikel.aktiv ? '' : 'opacity-50'}>
                <td className="px-2.5 py-2">
                  <span className="mr-1.5 inline-block h-4 w-4 rounded-full align-middle"
                    style={{ backgroundColor: artikel.farbe }} />
                  <span className="text-sm">{artikel.name}</span>
                </td>
                <td className="nummer px-2.5 py-2">{formatEuro(artikel.preis_cent)}</td>
                {rolle === 'admin' && (
                  <td className="nummer px-2.5 py-2">
                    {artikel.einkaufskosten_cent != null
                      ? formatEuro(artikel.einkaufskosten_cent)
                      : <span className="text-schrift-gedimmt">—</span>}
                  </td>
                )}
                <td className="max-w-40 truncate px-2.5 py-2 text-schrift-gedimmt">
                  {beilagenNamen(artikel.beilagen_ids) || '—'}
                </td>
                <td className="px-2.5 py-2">
                  <button onClick={() => setStartnummer(artikel)}
                    className="nummer cursor-pointer rounded-full border border-linie px-2 py-1 text-sm hover:bg-flaeche-hell">
                    {artikel.naechste_nummer}
                  </button>
                </td>
                <td className="px-2.5 py-2">
                  <button
                    onClick={() => apiPut(`/api/artikel/${artikel.id}`, {
                      ...artikel, aktiv: artikel.aktiv ? 0 : 1,
                    }).catch((f) => setFehler(f.message))}
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold ${
                      artikel.aktiv ? 'bg-navy text-grund' : 'border border-linie text-schrift-gedimmt'
                    }`}>
                    {artikel.aktiv ? 'aktiv' : 'inaktiv'}
                  </button>
                </td>
                <td className="px-2.5 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setFormular({ artikel })}
                    className="mr-1.5 cursor-pointer rounded-full border border-linie px-2 py-1 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
                    Bearbeiten
                  </button>
                  <button onClick={() => setLoeschung(artikel)}
                    className="cursor-pointer rounded-full border border-linie px-2 py-1 text-sm text-weinrot hover:bg-flaeche-hell">
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formular && (
        <ArtikelFormular artikel={formular.artikel} beilagen={beilagen} rolle={rolle}
          onSpeichern={speichern} onAbbrechen={() => setFormular(null)} />
      )}

      {startnummer && (
        <StartnummerDialog artikel={startnummer}
          onFertig={() => setStartnummer(null)}
          onAbbrechen={() => setStartnummer(null)} />
      )}

      {loeschung && (
        <Dialog titel="Artikel löschen?" onSchliessen={() => setLoeschung(null)}>
          <p className="mb-4 text-sm">
            „{loeschung.name}“ verschwindet aus Kasse und Verwaltung. Die Statistik
            vergangener Tage bleibt unverändert.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setLoeschung(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button
              onClick={() => apiDelete(`/api/artikel/${loeschung.id}`)
                .then(() => setLoeschung(null))
                .catch((f) => { setFehler(f.message); setLoeschung(null); })}
              className="flex-1 cursor-pointer rounded-full bg-weinrot py-1.5 text-sm font-bold text-flaeche hover:bg-weinrot-hell">
              Ja, löschen
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
