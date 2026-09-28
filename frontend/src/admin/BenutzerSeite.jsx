import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import Dialog from '../komponenten/Dialog.jsx';
import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/benutzer.js';
import { de as rollenDe, tr as rollenTr } from '../sprache/rollen.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function BenutzerSeite({ sprache = 'de' }) {
  const neueste = useNeuesteAntwort();
  const texte = sprache === 'tr'
    ? { ...gemeinsamTr, ...rollenTr, ...eigeneTr }
    : { ...gemeinsamDe, ...rollenDe, ...eigeneDe };
  const [benutzer, setBenutzer] = useState([]);
  const [anlage, setAnlage] = useState(null);
  const [passwortReset, setPasswortReset] = useState(null);
  const [loeschung, setLoeschung] = useState(null);
  const [fehler, setFehler] = useState('');

  function nachladen() {
    neueste('/api/benutzer', apiGet('/api/benutzer'), setBenutzer).catch(() => {});
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
      <h2 className="mb-4 font-display text-base text-navy">{texte.titel}</h2>

      <button onClick={() => setAnlage({ benutzername: '', passwort: '', rolle: 'kasse' })}
        className="kaertchen-schatten mb-4 cursor-pointer rounded-full bg-blau px-4 py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
        {texte.benutzerAnlegen}
      </button>

      {fehler && <p className="mb-2.5 max-w-md rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">{fehler}</p>}

      <ul className="kaertchen-schatten w-fit divide-y divide-linie rounded-lg border border-linie bg-flaeche text-sm">
        {benutzer.map((konto) => (
          <li key={konto.id} className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="w-32 shrink-0 text-sm">{konto.benutzername}</span>
            <span className="w-24 shrink-0 rounded-full border border-linie px-2 py-1 text-center text-xs text-schrift-gedimmt">
              {texte[konto.rolle]}
            </span>
            <button onClick={() => setPasswortReset({ id: konto.id, benutzername: konto.benutzername, passwort: '' })}
              className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-linie px-2 py-1 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              {texte.passwortZuruecksetzen}
            </button>
            <button onClick={() => setLoeschung(konto)}
              className="shrink-0 cursor-pointer rounded-full border border-linie px-2 py-1 text-sm text-weinrot hover:bg-flaeche-hell">
              {texte.loeschen}
            </button>
          </li>
        ))}
      </ul>

      {anlage && (
        <Dialog titel={texte.benutzerAnlegen} onSchliessen={() => setAnlage(null)}>
          <label className="mb-1 block text-xs text-schrift-gedimmt">{texte.benutzername}</label>
          <input value={anlage.benutzername} autoFocus
            onChange={(e) => setAnlage({ ...anlage, benutzername: e.target.value })}
            className={eingabeKlasse} />
          <label className="mb-1 block text-xs text-schrift-gedimmt">{texte.passwortLabel}</label>
          <input type="password" value={anlage.passwort}
            onChange={(e) => setAnlage({ ...anlage, passwort: e.target.value })}
            className={eingabeKlasse} />
          <label className="mb-1 block text-xs text-schrift-gedimmt">{texte.rolle}</label>
          <Auswahlmenue wert={anlage.rolle}
            onWahl={(neueRolle) => setAnlage({ ...anlage, rolle: neueRolle })}
            optionen={[
              { wert: 'kasse', text: texte.kasse },
              { wert: 'belegen', text: texte.belegen },
              { wert: 'ausgabe', text: texte.ausgabe },
              { wert: 'verwaltung', text: texte.verwaltung },
              { wert: 'admin', text: texte.admin },
            ]}
            klasse="mb-2.5 w-full text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setAnlage(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              {texte.abbrechen}
            </button>
            <button onClick={anlegen}
              className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
              {texte.anlegen}
            </button>
          </div>
        </Dialog>
      )}

      {passwortReset && (
        <Dialog titel={`${passwortReset.benutzername}: ${texte.neuesPasswortSuffix}`}
          onSchliessen={() => setPasswortReset(null)}>
          <input type="password" value={passwortReset.passwort} autoFocus
            placeholder={texte.neuesPasswortPlatzhalter}
            onChange={(e) => setPasswortReset({ ...passwortReset, passwort: e.target.value })}
            className={eingabeKlasse} />
          <div className="flex gap-2">
            <button onClick={() => setPasswortReset(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              {texte.abbrechen}
            </button>
            <button onClick={passwortSetzen}
              className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
              {texte.speichern}
            </button>
          </div>
        </Dialog>
      )}

      {loeschung && (
        <Dialog titel={texte.benutzerLoeschenTitel} onSchliessen={() => setLoeschung(null)}>
          <p className="mb-4 text-sm">
            {texte.loeschenVorspann}{loeschung.benutzername}{texte.loeschenNachspann}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setLoeschung(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              {texte.abbrechen}
            </button>
            <button onClick={loeschen}
              className="flex-1 cursor-pointer rounded-full bg-weinrot py-1.5 text-sm font-bold text-flaeche hover:bg-weinrot-hell">
              {texte.jaLoeschen}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
