import { useState } from 'react';
import { apiGet, apiPost, formatEuro } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import LadefehlerHinweis from '../komponenten/LadefehlerHinweis.jsx';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Dialog from '../komponenten/Dialog.jsx';
import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';
import { lesbareSchriftfarbe } from '../komponenten/farbe.js';
import { zweisprachigerName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/stornoTab.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function StornoTab({ sprache }) {
  const { neueste, ladefehler } = useNeuesteAntwort(laden);
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [kaertchenListe, setKaertchenListe] = useState([]);
  const [nummernFilter, setNummernFilter] = useState('');
  const [artikelFilter, setArtikelFilter] = useState('');
  const [auswahl, setAuswahl] = useState(null);
  const [fehler, setFehler] = useState('');

  function laden() {
    neueste('/api/kasse/stornierbar', apiGet('/api/kasse/stornierbar'), setKaertchenListe).catch(() => {});
  }
  useLiveUpdate(['kaertchen'], laden);

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
      {ladefehler && <LadefehlerHinweis sprache={sprache} onErneut={laden} />}
      <div className="mb-4 flex gap-3">
        <input value={nummernFilter} onChange={(e) => setNummernFilter(e.target.value)}
          placeholder={texte.nummerSuchen} inputMode="numeric"
          className="w-48 rounded border border-linie bg-flaeche px-3 py-3 text-lg outline-none focus:border-blau-hell" />
        <Auswahlmenue wert={artikelFilter} onWahl={setArtikelFilter}
          optionen={[
            { wert: '', text: texte.alleArtikel },
            ...artikelNamen.map((name) => ({ wert: name, text: name })),
          ]}
          klasse="text-lg" />
      </div>

      {fehler && <p className="mb-4 rounded bg-blau/30 px-3 py-2 text-blau">{fehler}</p>}

      {gefiltert.length === 0 && !ladefehler && (
        <p className="text-schrift-gedimmt">{texte.keineKaertchen}</p>
      )}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {gefiltert.map((kaertchen) => (
          <li key={kaertchen.id}>
            <button onClick={() => setAuswahl(kaertchen)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-linie bg-flaeche p-3 text-left hover:bg-flaeche-hell">
              <span className="nummer rounded-lg px-3 py-2 text-2xl"
                style={{
                  backgroundColor: kaertchen.artikel_farbe,
                  color: lesbareSchriftfarbe(kaertchen.artikel_farbe),
                }}>
                {kaertchen.nummer}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg">
                  {zweisprachigerName(kaertchen.artikel_name, kaertchen.artikel_name_tr, sprache)}
                </span>
                <span className="block truncate text-sm text-schrift-gedimmt">
                  {kaertchen.erstellt_am.slice(11, 16)}{texte.uhr ? ` ${texte.uhr}` : ''}
                  {kaertchen.beilagen.length > 0 &&
                    ` · ${kaertchen.beilagen.map((name, i) => zweisprachigerName(name, (kaertchen.beilagen_tr ?? [])[i], sprache)).join(', ')}`}
                </span>
              </span>
              <span className="nummer">{formatEuro(kaertchen.preis_cent)}</span>
            </button>
          </li>
        ))}
      </ul>

      {auswahl && (
        <Dialog titel={texte.stornieren} onSchliessen={() => setAuswahl(null)}>
          <p className="mb-6 text-lg">
            {zweisprachigerName(auswahl.artikel_name, auswahl.artikel_name_tr, sprache)} {texte.nrPraefix} {auswahl.nummer} {texte.stornierenVorspann}{' '}
            <strong>{formatEuro(auswahl.preis_cent)} {texte.zurueckgeben}</strong> {texte.stornierenNachspann}{' '}
            {auswahl.nummer} {texte.einziehenSuffix}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setAuswahl(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-3 text-schrift-gedimmt hover:bg-flaeche-hell">
              {texte.abbrechen}
            </button>
            <button onClick={stornieren}
              className="flex-1 cursor-pointer rounded-full bg-blau py-3 text-lg font-bold text-flaeche hover:bg-blau-hell">
              {texte.jaStornieren}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
