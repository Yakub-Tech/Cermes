import { useState } from 'react';
import Dialog from '../komponenten/Dialog.jsx';
import { formatEuro } from '../api.js';
import { de, tr } from '../sprache/geparkt.js';

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
        geparkte.length > 2 ? 'border-b border-linie pb-1 shadow-[inset_0_-14px_10px_-10px_rgba(0,0,0,0.45)]' : ''
      }`}>
        {geparkte.map((eintrag, index) => {
          const portionen = eintrag.positionen.reduce((s, p) => s + p.menge, 0);
          const summe = eintrag.positionen.reduce((s, p) => s + p.preis_cent * p.menge, 0);
          return (
            <li key={eintrag.id} className="rounded-2xl border border-linie p-3">
              <p className="text-lg font-semibold">{texte.bestellung} {index + 1}</p>
              <p className="text-base text-schrift-gedimmt">
                {uhrzeit(eintrag.zeitpunkt)} {texte.uhr}, {texte.portionen}: {portionen}, <span className="whitespace-nowrap">{formatEuro(summe)}</span>
              </p>
              <p className="mb-3 text-sm text-schrift-gedimmt">
                {eintrag.positionen.map((p) => `${p.menge}× ${sprache === 'tr' && p.artikel_name_tr ? p.artikel_name_tr : p.artikel_name}`).join(', ')}
              </p>
              {verwerfenId === eintrag.id ? (
                <div>
                  <p className="mb-2 text-sm text-weinrot">{texte.verwerfenFrage}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setVerwerfenId(null)}
                      className="flex-1 cursor-pointer rounded-full border border-linie py-3 text-base text-schrift-gedimmt hover:bg-flaeche-hell">
                      {texte.abbrechen}
                    </button>
                    <button onClick={() => { onVerwerfen(eintrag); setVerwerfenId(null); }}
                      className="flex-1 cursor-pointer rounded-full bg-weinrot py-3 text-base font-bold text-flaeche hover:bg-weinrot-hell">
                      {texte.verwerfen}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setVerwerfenId(eintrag.id)}
                    className="flex-1 cursor-pointer rounded-full border border-linie py-3 text-base text-weinrot hover:bg-flaeche-hell">
                    {texte.verwerfen}
                  </button>
                  <button onClick={() => onZurueckholen(eintrag)}
                    className="flex-1 cursor-pointer rounded-full bg-blau py-3 text-base font-bold text-flaeche hover:bg-blau-hell">
                    {texte.zurueckholen}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button onClick={onSchliessen}
        className="w-full cursor-pointer rounded-full border border-linie py-3 text-base text-schrift-gedimmt hover:bg-flaeche-hell">
        {texte.schliessen}
      </button>
    </Dialog>
  );
}
