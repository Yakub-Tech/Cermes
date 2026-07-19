import { useState } from 'react';
import { apiUpload } from '../api.js';

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
    <div className="max-w-lg space-y-8">
      <section>
        <h2 className="mb-4 font-display text-2xl text-gold">Backup herunterladen</h2>
        <p className="mb-4 text-schrift-gedimmt">
          Lädt eine ZIP-Datei mit der kompletten Datenbank und allen Werbebildern herunter.
          Am besten nach jedem Verkaufstag einmal machen und die Datei sicher ablegen.
        </p>
        <button onClick={() => { location.href = '/api/backup'; }}
          className="rounded-xl bg-rot px-8 py-4 text-xl font-bold hover:bg-rot-hell">
          Backup herunterladen
        </button>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl text-gold">Backup einspielen</h2>
        <form onSubmit={einspielen} className="rounded-xl border border-linie bg-flaeche p-6">
          <p className="mb-4 rounded-lg border border-rot bg-rot/20 px-4 py-3 text-rot-hell">
            Achtung: Das Einspielen <strong>ersetzt alle aktuellen Daten</strong>,
            also Verkäufe, Artikel, Benutzer und Werbebilder, durch den Stand aus der Backup-Datei.
          </p>
          <input type="file" accept=".zip"
            onChange={(e) => setDatei(e.target.files[0] || null)}
            className="mb-4 block w-full text-schrift-gedimmt" />
          <label className="mb-4 flex items-center gap-2">
            <input type="checkbox" checked={bestaetigt}
              onChange={(e) => setBestaetigt(e.target.checked)} />
            <span>Ich habe verstanden, dass alle aktuellen Daten ersetzt werden.</span>
          </label>
          {hinweis && <p className="mb-3 rounded bg-gold/20 px-3 py-2 text-gold">{hinweis}</p>}
          {fehler && <p className="mb-3 rounded bg-rot/30 px-3 py-2 text-rot-hell">{fehler}</p>}
          <button type="submit" disabled={!datei || !bestaetigt || laeuft}
            className="rounded-lg bg-rot px-6 py-2 font-bold hover:bg-rot-hell disabled:opacity-40">
            {laeuft ? 'Wird eingespielt …' : 'Backup einspielen'}
          </button>
        </form>
      </section>
    </div>
  );
}
