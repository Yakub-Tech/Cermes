import { useState } from 'react';
import { apiUpload } from '../api.js';
import Kontrollkaestchen from '../komponenten/Kontrollkaestchen.jsx';
import DateiAuswahl from '../komponenten/DateiAuswahl.jsx';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import { Button } from '@/komponenten/ui/button';
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
        <h2 className="mb-2.5 font-display text-base font-semibold tracking-tight text-schrift">{texte.herunterladenTitel}</h2>
        <p className="mb-2.5 max-w-sm text-sm text-schrift-gedimmt">
          {texte.herunterladenErklaerung}
        </p>
        <Button onClick={() => { location.href = '/api/backup'; }}
          className="h-auto px-5 py-2.5 text-sm font-bold">
          {texte.herunterladenTitel}
        </Button>
      </section>

      <section>
        <h2 className="mb-2.5 font-display text-base font-semibold tracking-tight text-schrift">{texte.einspielenTitel}</h2>
        <form onSubmit={einspielen} className="kaertchen-schatten max-w-sm rounded-lg border border-linie bg-flaeche p-4">
          <Hinweiskasten art="warnung" className="mb-2.5 px-2.5 py-2 text-sm">
            {texte.einspielenWarnungVorspann} <strong>{texte.einspielenWarnungFett}</strong>
            {texte.einspielenWarnungNachspann}
          </Hinweiskasten>
          <div className="mb-2.5">
            <DateiAuswahl akzeptiert=".zip" wert={datei} onWahl={setDatei}
              typFehlerText={texte.zipTypFehler} sprache={sprache} />
          </div>
          <label className="mb-2.5 flex cursor-pointer items-center gap-1.5 text-sm">
            <Kontrollkaestchen markiert={bestaetigt} onWahl={setBestaetigt} />
            <span>{texte.bestaetigung}</span>
          </label>
          {hinweis && <Hinweiskasten art="erfolg" className="mb-2 px-2 py-1.5 text-sm">{hinweis}</Hinweiskasten>}
          {fehler && <Hinweiskasten art="fehler" className="mb-2 px-2 py-1.5 text-sm">{fehler}</Hinweiskasten>}
          <Button type="submit" disabled={!datei || !bestaetigt || laeuft} className="px-4 text-sm font-bold">
            {laeuft ? texte.wirdEingespielt : texte.einspielenTitel}
          </Button>
        </form>
      </section>
    </div>
  );
}
