import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import LadefehlerHinweis from '../komponenten/LadefehlerHinweis.jsx';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import Dialog from '../komponenten/Dialog.jsx';
import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';
import { Badge } from '@/komponenten/ui/badge';
import { Button } from '@/komponenten/ui/button';
import { Input } from '@/komponenten/ui/input';
import { Label } from '@/komponenten/ui/label';
import { EINGABE_DICHT } from './eingabeKlasse.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/benutzer.js';
import { de as rollenDe, tr as rollenTr } from '../sprache/rollen.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

const LABEL = 'text-xs font-normal';
const EINGABE = `mb-2.5 ${EINGABE_DICHT}`;

export default function BenutzerSeite({ sprache = 'de' }) {
  const { neueste, ladefehler } = useNeuesteAntwort(nachladen);
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

  return (
    <div>
      <h2 className="mb-4 font-display text-base font-semibold tracking-tight text-schrift">{texte.titel}</h2>

      <Button onClick={() => setAnlage({ benutzername: '', passwort: '', rolle: 'kasse' })}
        className="mb-4 px-4 text-sm font-bold">
        {texte.benutzerAnlegen}
      </Button>

      {ladefehler && <LadefehlerHinweis sprache={sprache} onErneut={nachladen} />}

      {fehler && <Hinweiskasten art="fehler" className="mb-2.5 max-w-md px-2 py-1.5 text-sm">{fehler}</Hinweiskasten>}

      <ul className="kaertchen-schatten w-fit divide-y divide-linie rounded-lg border border-linie bg-flaeche text-sm">
        {benutzer.map((konto) => (
          <li key={konto.id} className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="w-32 shrink-0 text-sm">{konto.benutzername}</span>
            <Badge variant="outline" className="w-24 shrink-0 text-schrift-gedimmt">
              {texte[konto.rolle]}
            </Badge>
            <Button variant="outline" size="sm"
              onClick={() => setPasswortReset({ id: konto.id, benutzername: konto.benutzername, passwort: '' })}
              className="shrink-0 px-2 text-sm text-schrift-gedimmt">
              {texte.passwortZuruecksetzen}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLoeschung(konto)}
              className="shrink-0 px-2 text-sm text-gefahr-schrift">
              {texte.loeschen}
            </Button>
          </li>
        ))}
      </ul>

      {anlage && (
        <Dialog titel={texte.benutzerAnlegen} onSchliessen={() => setAnlage(null)}>
          <Label className={LABEL}>{texte.benutzername}</Label>
          <Input value={anlage.benutzername} autoFocus
            onChange={(e) => setAnlage({ ...anlage, benutzername: e.target.value })}
            className={EINGABE} />
          <Label className={LABEL}>{texte.passwortLabel}</Label>
          <Input type="password" value={anlage.passwort}
            onChange={(e) => setAnlage({ ...anlage, passwort: e.target.value })}
            className={EINGABE} />
          <Label className={LABEL}>{texte.rolle}</Label>
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
            <Button variant="outline" onClick={() => setAnlage(null)}
              className="flex-1 text-sm text-schrift-gedimmt">
              {texte.abbrechen}
            </Button>
            <Button onClick={anlegen} className="flex-1 text-sm font-bold">
              {texte.anlegen}
            </Button>
          </div>
        </Dialog>
      )}

      {passwortReset && (
        <Dialog titel={`${passwortReset.benutzername}: ${texte.neuesPasswortSuffix}`}
          onSchliessen={() => setPasswortReset(null)}>
          <Input type="password" value={passwortReset.passwort} autoFocus
            placeholder={texte.neuesPasswortPlatzhalter}
            onChange={(e) => setPasswortReset({ ...passwortReset, passwort: e.target.value })}
            className={EINGABE} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPasswortReset(null)}
              className="flex-1 text-sm text-schrift-gedimmt">
              {texte.abbrechen}
            </Button>
            <Button onClick={passwortSetzen} className="flex-1 text-sm font-bold">
              {texte.speichern}
            </Button>
          </div>
        </Dialog>
      )}

      {loeschung && (
        <Dialog titel={texte.benutzerLoeschenTitel} onSchliessen={() => setLoeschung(null)}>
          <p className="mb-4 text-sm">
            {texte.loeschenVorspann}{loeschung.benutzername}{texte.loeschenNachspann}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLoeschung(null)}
              className="flex-1 text-sm text-schrift-gedimmt">
              {texte.abbrechen}
            </Button>
            <Button variant="gefahr" onClick={loeschen} className="flex-1 text-sm font-bold">
              {texte.jaLoeschen}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
