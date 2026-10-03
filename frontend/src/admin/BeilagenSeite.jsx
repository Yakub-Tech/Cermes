import { useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import LadefehlerHinweis from '../komponenten/LadefehlerHinweis.jsx';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import Pillenschalter from '../komponenten/Pillenschalter.jsx';
import { Button } from '@/komponenten/ui/button';
import { Input } from '@/komponenten/ui/input';
import { EINGABE_DICHT } from './eingabeKlasse.js';
import { useLiveUpdate } from '../useLiveUpdate.js';
import Dialog from '../komponenten/Dialog.jsx';
import Kontrollkaestchen from '../komponenten/Kontrollkaestchen.jsx';
import { beideSprachenName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/beilagen.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function BeilagenSeite({ sprache = 'de' }) {
  const { neueste, ladefehler } = useNeuesteAntwort(laden);
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [beilagen, setBeilagen] = useState([]);
  const [neuerName, setNeuerName] = useState('');
  const [neuerNameTr, setNeuerNameTr] = useState('');
  const [neuerNurDeutsch, setNeuerNurDeutsch] = useState(false);
  const [bearbeitung, setBearbeitung] = useState(null);
  const [loeschung, setLoeschung] = useState(null);
  const [fehler, setFehler] = useState('');
  const [legtGeradeAn, setLegtGeradeAn] = useState(false);

  function laden() {
    neueste('/api/beilagen', apiGet('/api/beilagen'), setBeilagen).catch(() => {});
  }
  useLiveUpdate(['beilagen'], laden);

  async function anlegen(ereignis) {
    ereignis.preventDefault();
    if (legtGeradeAn) return;
    if (!neuerNurDeutsch && neuerNameTr.trim() === '') {
      setFehler(`${texte.tuerkischerNameFehlerVorspann}${texte.nurAufDeutsch}${texte.tuerkischerNameFehlerNachspann}`);
      return;
    }
    setFehler('');
    setLegtGeradeAn(true);
    try {
      await apiPost('/api/beilagen', { name: neuerName, name_tr: neuerNurDeutsch ? '' : neuerNameTr });
      setNeuerName('');
      setNeuerNameTr('');
      setNeuerNurDeutsch(false);
    } catch (f) {
      setFehler(f.message);
    } finally {
      setLegtGeradeAn(false);
    }
  }

  async function speichern() {
    if (!bearbeitung.nurDeutsch && (bearbeitung.name_tr ?? '').trim() === '') {
      setFehler(`${texte.tuerkischerNameFehlerVorspann}${texte.nurAufDeutsch}${texte.tuerkischerNameFehlerNachspann}`);
      return;
    }
    setFehler('');
    try {
      await apiPut(`/api/beilagen/${bearbeitung.id}`, {
        name: bearbeitung.name, name_tr: bearbeitung.nurDeutsch ? '' : bearbeitung.name_tr,
        aktiv: bearbeitung.aktiv,
      });
      setBearbeitung(null);
    } catch (f) {
      setFehler(f.message);
    }
  }

  return (
    <div>
      <h2 className="mb-4 font-display text-base font-semibold tracking-tight text-schrift">{texte.titel}</h2>

      <form onSubmit={anlegen} className="mb-4 flex max-w-md flex-wrap items-center gap-2">
        <Input value={neuerName} onChange={(e) => setNeuerName(e.target.value)}
          placeholder={texte.neuePlatzhalter} className={`w-auto flex-1 ${EINGABE_DICHT}`} />
        {!neuerNurDeutsch && (
          <Input value={neuerNameTr} onChange={(e) => setNeuerNameTr(e.target.value)}
            placeholder={texte.nameTuerkisch} className={`w-auto flex-1 ${EINGABE_DICHT}`} />
        )}
        <label className="flex items-center gap-1.5 text-xs text-schrift-gedimmt">
          <Kontrollkaestchen markiert={neuerNurDeutsch} onWahl={setNeuerNurDeutsch} />
          {texte.nurAufDeutsch}
        </label>
        <Button type="submit" disabled={neuerName.trim() === '' || legtGeradeAn} className="px-4 text-sm font-bold">
          {texte.anlegen}
        </Button>
      </form>

      {ladefehler && <LadefehlerHinweis sprache={sprache} onErneut={laden} />}

      {fehler && <Hinweiskasten art="fehler" className="mb-2.5 max-w-md px-2 py-1.5 text-sm">{fehler}</Hinweiskasten>}

      <ul className="kaertchen-schatten max-w-md divide-y divide-linie rounded-lg border border-linie bg-flaeche text-sm">
        {beilagen.length === 0 && !ladefehler && (
          <li className="px-2.5 py-4 text-schrift-gedimmt">{texte.keineBeilagen}</li>
        )}
        {beilagen.map((beilage) => (
          <li key={beilage.id} className="flex items-center gap-2.5 px-2.5 py-2">
            <span className={`flex-1 text-sm ${beilage.aktiv ? '' : 'text-schrift-gedimmt line-through'}`}>
              {beideSprachenName(beilage.name, beilage.name_tr)}
            </span>
            <Pillenschalter an={!!beilage.aktiv}
              onClick={() => apiPut(`/api/beilagen/${beilage.id}`, {
                name: beilage.name, aktiv: beilage.aktiv ? 0 : 1,
              }).catch((f) => setFehler(f.message))}>
              {beilage.aktiv ? texte.aktiv : texte.inaktiv}
            </Pillenschalter>
            <Button variant="outline" size="sm" onClick={() => setBearbeitung({ ...beilage, nurDeutsch: !beilage.name_tr })}
              className="px-2 text-sm text-schrift-gedimmt">
              {texte.umbenennen}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLoeschung(beilage)}
              className="px-2 text-sm text-gefahr-schrift">
              {texte.loeschen}
            </Button>
          </li>
        ))}
      </ul>

      {bearbeitung && (
        <Dialog titel={texte.umbenennenTitel} onSchliessen={() => setBearbeitung(null)}>
          <Input value={bearbeitung.name} autoFocus
            onChange={(e) => setBearbeitung({ ...bearbeitung, name: e.target.value })}
            className={`mb-2.5 ${EINGABE_DICHT}`} />
          <label className="mb-1 flex items-center gap-1.5 text-xs text-schrift-gedimmt">
            <Kontrollkaestchen markiert={bearbeitung.nurDeutsch}
              onWahl={(wert) => setBearbeitung({ ...bearbeitung, nurDeutsch: wert })} />
            {texte.nurAufDeutsch}
          </label>
          {!bearbeitung.nurDeutsch && (
            <Input value={bearbeitung.name_tr ?? ''} placeholder={texte.nameTuerkisch}
              onChange={(e) => setBearbeitung({ ...bearbeitung, name_tr: e.target.value })}
              className={`mb-2.5 ${EINGABE_DICHT}`} />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBearbeitung(null)}
              className="flex-1 text-sm text-schrift-gedimmt">
              {texte.abbrechen}
            </Button>
            <Button onClick={speichern} className="flex-1 text-sm font-bold">
              {texte.speichern}
            </Button>
          </div>
        </Dialog>
      )}

      {loeschung && (
        <Dialog titel={texte.beilageLoeschenTitel} onSchliessen={() => setLoeschung(null)}>
          <p className="mb-4 text-sm">
            {texte.loeschenVorspann}{beideSprachenName(loeschung.name, loeschung.name_tr)}{texte.loeschenNachspann}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLoeschung(null)}
              className="flex-1 text-sm text-schrift-gedimmt">
              {texte.abbrechen}
            </Button>
            <Button variant="gefahr"
              onClick={() => apiDelete(`/api/beilagen/${loeschung.id}`)
                .then(() => setLoeschung(null))
                .catch((f) => { setFehler(f.message); setLoeschung(null); })}
              className="flex-1 text-sm font-bold">
              {texte.jaLoeschen}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
