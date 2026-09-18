import { useState } from 'react';
import { apiUpload } from '../api.js';
import Kontrollkaestchen from '../komponenten/Kontrollkaestchen.jsx';
import DateiAuswahl from '../komponenten/DateiAuswahl.jsx';
import { de, tr } from '../sprache/backup.js';

export default function BackupSeite({ sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;
  const [datei, setDatei] = useState(null);
  const [bestaetigt, setBestaetigt] = useState(false);
  const [hinweis, setHinweis] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  async function einspielen(ereignis) {
    ereignis.preventDefault();
    setLaeuft(true);
    setHinweis('');
    setFehler('');
    try {
      const formData = new FormData();
      formData.append('backup', datei);
      const antwort = await apiUpload('/api/backup/einspielen', formData);
      setHinweis(antwort.hinweis);
      setDatei(null);
      setBestaetigt(false);
    } catch (f) {
      setFehler(f.message);
    }
    setLaeuft(false);
  }

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2.5 font-display text-base text-navy">{texte.herunterladenTitel}</h2>
        <p className="mb-2.5 max-w-sm text-sm text-schrift-gedimmt">
          {texte.herunterladenErklaerung}
        </p>
        <button onClick={() => { location.href = '/api/backup'; }}
          className="kaertchen-schatten cursor-pointer rounded-full bg-blau px-5 py-2.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
          {texte.herunterladenTitel}
        </button>
      </section>

      <section>
        <h2 className="mb-2.5 font-display text-base text-navy">{texte.einspielenTitel}</h2>
        <form onSubmit={einspielen} className="kaertchen-schatten max-w-sm rounded-lg border border-linie bg-flaeche p-4">
          <p className="mb-2.5 rounded-lg border border-blau bg-blau/20 px-2.5 py-2 text-sm text-blau">
            {texte.einspielenWarnungVorspann} <strong>{texte.einspielenWarnungFett}</strong>
            {texte.einspielenWarnungNachspann}
          </p>
          <div className="mb-2.5">
            <DateiAuswahl akzeptiert=".zip" wert={datei} onWahl={setDatei}
              typFehlerText={texte.zipTypFehler} sprache={sprache} />
          </div>
          <label className="mb-2.5 flex cursor-pointer items-center gap-1.5 text-sm">
            <Kontrollkaestchen markiert={bestaetigt} onWahl={setBestaetigt} />
            <span>{texte.bestaetigung}</span>
          </label>
          {hinweis && <p className="mb-2 rounded bg-akzent/10 px-2 py-1.5 text-sm text-akzent-text">{hinweis}</p>}
          {fehler && <p className="mb-2 rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">{fehler}</p>}
          <button type="submit" disabled={!datei || !bestaetigt || laeuft}
            className="cursor-pointer rounded-full bg-blau px-4 py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-40">
            {laeuft ? texte.wirdEingespielt : texte.einspielenTitel}
          </button>
        </form>
      </section>
    </div>
  );
}
