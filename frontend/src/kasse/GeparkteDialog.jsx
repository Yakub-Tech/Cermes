import { useState } from 'react';
import Dialog from '../komponenten/Dialog.jsx';
import { formatEuro } from '../api.js';
import { de, tr } from '../sprache/geparkt.js';
import { KNOPF_NEBEN, KNOPF_HAUPT, KNOPF_GEFAHR } from './knopfKlassen.js';

function uhrzeit(zeitpunkt) {
  return new Date(zeitpunkt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function GeparkteDialog({ geparkte, sprache, onZurueckholen, onVerwerfen, onSchliessen }) {
  const texte = sprache === 'tr' ? tr : de;
  const [verwerfenId, setVerwerfenId] = useState(null);

  return (
    <Dialog titel={texte.titel} onSchliessen={onSchliessen}>
      {geparkte.length === 0 && <p className="mb-4 text-schrift-gedimmt">{texte.keine}</p>}
      <ul className={`mb-4 flex max-h-[50vh] flex-col gap-3 overflow-y-auto ${
        geparkte.length > 2 ? 'border-b border-linie pb-1 shadow-[inset_0_-14px_10px_-10px_var(--schattenfarbe)]' : ''
      }`}>
        {geparkte.map((eintrag, index) => {
          const portionen = eintrag.positionen.reduce((s, p) => s + p.menge, 0);
          const summe = eintrag.positionen.reduce((s, p) => s + p.preis_cent * p.menge, 0);
          return (
            <li key={eintrag.id} className="rounded-lg border border-linie bg-flaeche-hell/50 p-3">
              <p className="text-lg font-semibold text-schrift">{texte.bestellung} {index + 1}</p>
              <p className="text-base text-schrift-gedimmt">
                {uhrzeit(eintrag.zeitpunkt)} {texte.uhr}, {texte.portionen}: {portionen}, <span className="whitespace-nowrap">{formatEuro(summe)}</span>
              </p>
              <p className="mb-3 text-sm text-schrift-gedimmt">
                {eintrag.positionen.map((p) => `${p.menge}× ${sprache === 'tr' && p.artikel_name_tr ? p.artikel_name_tr : p.artikel_name}`).join(', ')}
              </p>
              {verwerfenId === eintrag.id ? (
                <div>
                  <p className="mb-2 text-sm text-gefahr-schrift">{texte.verwerfenFrage}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setVerwerfenId(null)}
                      className={`${KNOPF_NEBEN} flex-1 py-3 text-base text-schrift-gedimmt`}>
                      {texte.abbrechen}
                    </button>
                    <button onClick={() => { onVerwerfen(eintrag); setVerwerfenId(null); }}
                      className={`${KNOPF_GEFAHR} flex-1 py-3 text-base font-bold`}>
                      {texte.verwerfen}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setVerwerfenId(eintrag.id)}
                    className={`${KNOPF_NEBEN} flex-1 py-3 text-base text-gefahr-schrift`}>
                    {texte.verwerfen}
                  </button>
                  <button onClick={() => onZurueckholen(eintrag)}
                    className={`${KNOPF_HAUPT} flex-1 py-3 text-base font-bold`}>
                    {texte.zurueckholen}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button onClick={onSchliessen}
        className={`${KNOPF_NEBEN} w-full py-3 text-base text-schrift-gedimmt`}>
        {texte.schliessen}
      </button>
    </Dialog>
  );
}
