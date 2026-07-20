import { useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, formatEuro } from '../api.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Dialog from '../komponenten/Dialog.jsx';
import ArtikelFormular from './ArtikelFormular.jsx';
import StartnummerDialog from './StartnummerDialog.jsx';

export default function ArtikelSeite() {
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
    <div className="max-w-4xl">
      <h2 className="mb-6 font-display text-2xl text-navy">Artikel</h2>

      <button onClick={() => setFormular({ artikel: null })}
        className="mb-6 rounded-lg bg-blau px-6 py-2 font-bold text-flaeche hover:bg-blau-hell">
        Artikel anlegen
      </button>

      {fehler && <p className="mb-4 rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>}

      <div className="overflow-x-auto rounded-xl border border-linie bg-flaeche">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-linie text-sm text-schrift-gedimmt">
              <th className="px-4 py-3">Artikel</th>
              <th className="px-4 py-3">Preis</th>
              <th className="px-4 py-3">Kosten</th>
              <th className="px-4 py-3">Beilagen</th>
              <th className="px-4 py-3">Weiter bei Nr.</th>
              <th className="px-4 py-3">Aktiv</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linie">
            {artikelListe.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-6 text-schrift-gedimmt">
                Noch keine Artikel angelegt.
              </td></tr>
            )}
            {artikelListe.map((artikel) => (
              <tr key={artikel.id} className={artikel.aktiv ? '' : 'opacity-50'}>
                <td className="px-4 py-3">
                  <span className="mr-2 inline-block h-4 w-4 rounded-full align-middle"
                    style={{ backgroundColor: artikel.farbe }} />
                  <span className="text-lg">{artikel.name}</span>
                </td>
                <td className="nummer px-4 py-3">{formatEuro(artikel.preis_cent)}</td>
                <td className="nummer px-4 py-3">
                  {artikel.einkaufskosten_cent != null
                    ? formatEuro(artikel.einkaufskosten_cent)
                    : <span className="text-schrift-gedimmt">—</span>}
                </td>
                <td className="max-w-40 truncate px-4 py-3 text-schrift-gedimmt">
                  {beilagenNamen(artikel.beilagen_ids) || '—'}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setStartnummer(artikel)}
                    className="nummer rounded border border-linie px-3 py-1 hover:bg-flaeche-hell">
                    {artikel.naechste_nummer}
                  </button>
                  {artikel.hoechste_nummer_heute !== null && (
                    <span className="ml-2 text-sm text-schrift-gedimmt">
                      heute bis {artikel.hoechste_nummer_heute}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => apiPut(`/api/artikel/${artikel.id}`, {
                      ...artikel, aktiv: artikel.aktiv ? 0 : 1,
                    }).catch((f) => setFehler(f.message))}
                    className={`rounded-full px-4 py-1 text-sm font-semibold ${
                      artikel.aktiv ? 'bg-navy text-grund' : 'border border-linie text-schrift-gedimmt'
                    }`}>
                    {artikel.aktiv ? 'aktiv' : 'inaktiv'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => setFormular({ artikel })}
                    className="mr-2 rounded border border-linie px-3 py-1 text-schrift-gedimmt hover:bg-flaeche-hell">
                    Bearbeiten
                  </button>
                  <button onClick={() => setLoeschung(artikel)}
                    className="rounded border border-linie px-3 py-1 text-blau-hell hover:bg-flaeche-hell">
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formular && (
        <ArtikelFormular artikel={formular.artikel} beilagen={beilagen}
          onSpeichern={speichern} onAbbrechen={() => setFormular(null)} />
      )}

      {startnummer && (
        <StartnummerDialog artikel={startnummer}
          onFertig={() => setStartnummer(null)}
          onAbbrechen={() => setStartnummer(null)} />
      )}

      {loeschung && (
        <Dialog titel="Artikel löschen?" onSchliessen={() => setLoeschung(null)}>
          <p className="mb-6">
            „{loeschung.name}“ verschwindet aus Kasse und Verwaltung. Die Statistik
            vergangener Tage bleibt unverändert.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setLoeschung(null)}
              className="flex-1 rounded-lg border border-linie py-2 text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button
              onClick={() => apiDelete(`/api/artikel/${loeschung.id}`)
                .then(() => setLoeschung(null))
                .catch((f) => { setFehler(f.message); setLoeschung(null); })}
              className="flex-1 rounded-lg bg-blau py-2 font-bold text-flaeche hover:bg-blau-hell">
              Ja, löschen
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
