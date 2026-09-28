import { useEffect, useState } from 'react';
import { apiGet } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import AuditReiter from './AuditReiter.jsx';
import AuditFilter from './AuditFilter.jsx';
import AuditTabelle from './AuditTabelle.jsx';
import AuditSeitenwahl from './AuditSeitenwahl.jsx';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/audit.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';
import { de as rollenDe, tr as rollenTr } from '../sprache/rollen.js';

const LEERER_FILTER = { von: '', bis: '', benutzer: '' };

function abfrageParameter(bereich, filter, seite) {
  const teile = [`seite=${seite}`];
  if (bereich) teile.push(`bereich=${bereich}`);
  if (filter.von) teile.push(`von=${filter.von}`);
  if (filter.bis) teile.push(`bis=${filter.bis}`);
  if (filter.benutzer) teile.push(`benutzer=${encodeURIComponent(filter.benutzer)}`);
  return teile.join('&');
}

export default function AuditSeite({ sprache = 'de' }) {
  const neueste = useNeuesteAntwort();
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const rollenTexte = sprache === 'tr' ? rollenTr : rollenDe;

  const [bereich, setBereich] = useState('');
  const [filter, setFilter] = useState(LEERER_FILTER);
  const [entwurf, setEntwurf] = useState(LEERER_FILTER);
  const [seite, setSeite] = useState(1);
  const [daten, setDaten] = useState({ eintraege: [], gesamt: 0, seite: 1, seiten: 1 });
  const [benutzerOptionen, setBenutzerOptionen] = useState([]);
  const [neuLadenZaehler, setNeuLadenZaehler] = useState(0);

  function laden(neuerBereich, neuerFilter, neueSeite) {
    const adresse = `/api/audit?${abfrageParameter(neuerBereich, neuerFilter, neueSeite)}`;
    neueste('eintraege', apiGet(adresse), setDaten).catch(() => {});
  }

  useEffect(() => laden(bereich, filter, seite), [bereich, filter, seite, neuLadenZaehler]);
  useEffect(() => {
    neueste('/api/audit/benutzer', apiGet('/api/audit/benutzer'), setBenutzerOptionen).catch(() => {});
  }, []);

  function bereichWaehlen(neuerBereich) {
    setBereich(neuerBereich);
    setSeite(1);
  }

  function aktualisieren() {
    setFilter(entwurf);
    setSeite(1);
    setNeuLadenZaehler((zahl) => zahl + 1);
  }

  function zuruecksetzen() {
    setEntwurf(LEERER_FILTER);
    setFilter(LEERER_FILTER);
    setSeite(1);
  }

  return (
    <div>
      <h2 className="mb-4 font-display text-base text-navy">{texte.titel}</h2>

      <AuditReiter bereich={bereich} onWahl={bereichWaehlen} texte={texte} />
      <AuditFilter entwurf={entwurf} onEntwurfAendern={setEntwurf}
        onAktualisieren={aktualisieren} onZuruecksetzen={zuruecksetzen}
        benutzerOptionen={benutzerOptionen} texte={texte} />
      <AuditTabelle eintraege={daten.eintraege} texte={texte} rollenTexte={rollenTexte} />
      <AuditSeitenwahl seite={daten.seite} seiten={daten.seiten} gesamt={daten.gesamt}
        onSeiteWaehlen={setSeite} texte={texte} />
    </div>
  );
}
