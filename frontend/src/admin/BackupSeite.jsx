import { useState } from 'react';
import { apiUpload } from '../api.js';
import Kontrollkaestchen from '../komponenten/Kontrollkaestchen.jsx';
import DateiAuswahl from '../komponenten/DateiAuswahl.jsx';

export default function BackupSeite() {
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
        <h2 className="mb-2.5 font-display text-base text-navy">Backup herunterladen</h2>
        <p className="mb-2.5 max-w-sm text-sm text-schrift-gedimmt">
          Lädt eine ZIP-Datei mit der kompletten Datenbank und allen Werbebildern herunter.
          Am besten nach jedem Verkaufstag einmal machen und die Datei sicher ablegen.
        </p>
        <button onClick={() => { location.href = '/api/backup'; }}
          className="kaertchen-schatten cursor-pointer rounded-full bg-blau px-5 py-2.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
          Backup herunterladen
        </button>
      </section>

      <section>
        <h2 className="mb-2.5 font-display text-base text-navy">Backup einspielen</h2>
        <form onSubmit={einspielen} className="kaertchen-schatten max-w-sm rounded-lg border border-linie bg-flaeche p-4">
          <p className="mb-2.5 rounded-lg border border-blau bg-blau/20 px-2.5 py-2 text-sm text-blau">
            Achtung: Das Einspielen <strong>ersetzt alle aktuellen Daten</strong>,
            also Verkäufe, Artikel, Benutzer und Werbebilder, durch den Stand aus der Backup-Datei.
          </p>
          <div className="mb-2.5">
            <DateiAuswahl akzeptiert=".zip" wert={datei} onWahl={setDatei}
              typFehlerText="Bitte nur eine ZIP-Datei ablegen." />
          </div>
          <label className="mb-2.5 flex cursor-pointer items-center gap-1.5 text-sm">
            <Kontrollkaestchen markiert={bestaetigt} onWahl={setBestaetigt} />
            <span>Ich habe verstanden, dass alle aktuellen Daten ersetzt werden.</span>
          </label>
          {hinweis && <p className="mb-2 rounded bg-akzent/10 px-2 py-1.5 text-sm text-akzent-text">{hinweis}</p>}
          {fehler && <p className="mb-2 rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">{fehler}</p>}
          <button type="submit" disabled={!datei || !bestaetigt || laeuft}
            className="cursor-pointer rounded-full bg-blau px-4 py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-40">
            {laeuft ? 'Wird eingespielt …' : 'Backup einspielen'}
          </button>
        </form>
      </section>
    </div>
  );
}
