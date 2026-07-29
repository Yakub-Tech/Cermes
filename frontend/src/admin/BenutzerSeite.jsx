import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '../api.js';
import Dialog from '../komponenten/Dialog.jsx';
import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';

const rollenNamen = { admin: 'Admin', verwaltung: 'Verwaltung', kasse: 'Kasse', ausgabe: 'Ausgabe' };

export default function BenutzerSeite() {
  const [benutzer, setBenutzer] = useState([]);
  const [anlage, setAnlage] = useState(null);
  const [passwortReset, setPasswortReset] = useState(null);
  const [loeschung, setLoeschung] = useState(null);
  const [fehler, setFehler] = useState('');

  function nachladen() {
    apiGet('/api/benutzer').then(setBenutzer).catch(() => {});
  }
  useEffect(nachladen, []);

  async function anlegen() {
    setFehler('');
    try {
      await apiPost('/api/benutzer', anlage);
      setAnlage(null);
      nachladen();
    } catch (f) {
      setFehler(f.message);
    }
  }

  async function passwortSetzen() {
    setFehler('');
    try {
      await apiPost(`/api/benutzer/${passwortReset.id}/passwort`, {
        passwort: passwortReset.passwort,
      });
      setPasswortReset(null);
    } catch (f) {
      setFehler(f.message);
    }
  }

  async function loeschen() {
    setFehler('');
    try {
      await apiDelete(`/api/benutzer/${loeschung.id}`);
      setLoeschung(null);
      nachladen();
    } catch (f) {
      setFehler(f.message);
      setLoeschung(null);
    }
  }

  const eingabeKlasse =
    'mb-2.5 w-full rounded border border-linie bg-grund px-2 py-1.5 text-sm outline-none focus:border-blau-hell';

  return (
    <div>
      <h2 className="mb-4 font-display text-base text-navy">Benutzer</h2>

      <button onClick={() => setAnlage({ benutzername: '', passwort: '', rolle: 'kasse' })}
        className="mb-4 cursor-pointer rounded-full bg-blau px-4 py-1.5 font-bold text-flaeche hover:bg-blau-hell">
        Benutzer anlegen
      </button>

      {fehler && <p className="mb-2.5 max-w-md rounded bg-blau/30 px-2 py-1.5 text-blau">{fehler}</p>}

      <ul className="max-w-md divide-y divide-linie rounded-lg border border-linie bg-flaeche">
        {benutzer.map((konto) => (
          <li key={konto.id} className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="flex-1 text-sm">{konto.benutzername}</span>
            <span className="rounded-full border border-linie px-2 py-1 text-xs text-schrift-gedimmt">
              {rollenNamen[konto.rolle]}
            </span>
            <button onClick={() => setPasswortReset({ id: konto.id, benutzername: konto.benutzername, passwort: '' })}
              className="cursor-pointer rounded-full border border-linie px-2 py-1 text-schrift-gedimmt hover:bg-flaeche-hell">
              Passwort zurücksetzen
            </button>
            <button onClick={() => setLoeschung(konto)}
              className="cursor-pointer rounded-full border border-linie px-2 py-1 text-blau-hell hover:bg-flaeche-hell">
              Löschen
            </button>
          </li>
        ))}
      </ul>

      {anlage && (
        <Dialog titel="Benutzer anlegen" onSchliessen={() => setAnlage(null)}>
          <label className="mb-1 block text-xs text-schrift-gedimmt">Benutzername</label>
          <input value={anlage.benutzername} autoFocus
            onChange={(e) => setAnlage({ ...anlage, benutzername: e.target.value })}
            className={eingabeKlasse} />
          <label className="mb-1 block text-xs text-schrift-gedimmt">Passwort (mindestens 8 Zeichen)</label>
          <input type="password" value={anlage.passwort}
            onChange={(e) => setAnlage({ ...anlage, passwort: e.target.value })}
            className={eingabeKlasse} />
          <label className="mb-1 block text-xs text-schrift-gedimmt">Rolle</label>
          <Auswahlmenue wert={anlage.rolle}
            onWahl={(neueRolle) => setAnlage({ ...anlage, rolle: neueRolle })}
            optionen={[
              { wert: 'kasse', text: 'Kasse' },
              { wert: 'ausgabe', text: 'Ausgabe' },
              { wert: 'verwaltung', text: 'Verwaltung' },
              { wert: 'admin', text: 'Admin' },
            ]}
            klasse="mb-2.5 w-full" />
          <div className="flex gap-2">
            <button onClick={() => setAnlage(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button onClick={anlegen}
              className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 font-bold text-flaeche hover:bg-blau-hell">
              Anlegen
            </button>
          </div>
        </Dialog>
      )}

      {passwortReset && (
        <Dialog titel={`Neues Passwort für ${passwortReset.benutzername}`}
          onSchliessen={() => setPasswortReset(null)}>
          <input type="password" value={passwortReset.passwort} autoFocus
            placeholder="Neues Passwort (mindestens 8 Zeichen)"
            onChange={(e) => setPasswortReset({ ...passwortReset, passwort: e.target.value })}
            className={eingabeKlasse} />
          <div className="flex gap-2">
            <button onClick={() => setPasswortReset(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button onClick={passwortSetzen}
              className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 font-bold text-flaeche hover:bg-blau-hell">
              Speichern
            </button>
          </div>
        </Dialog>
      )}

      {loeschung && (
        <Dialog titel="Benutzer löschen?" onSchliessen={() => setLoeschung(null)}>
          <p className="mb-4">
            Das Konto „{loeschung.benutzername}“ wird dauerhaft gelöscht und kann
            sich nicht mehr anmelden.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setLoeschung(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-schrift-gedimmt hover:bg-flaeche-hell">
              Abbrechen
            </button>
            <button onClick={loeschen}
              className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 font-bold text-flaeche hover:bg-blau-hell">
              Ja, löschen
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
