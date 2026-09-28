import { useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../api.js';
import { useNeuesteAntwort } from '../neuesteAntwort.js';
import LadefehlerHinweis from '../komponenten/LadefehlerHinweis.jsx';
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
      <h2 className="mb-4 font-display text-base text-navy">{texte.titel}</h2>

      <form onSubmit={anlegen} className="mb-4 flex max-w-md flex-wrap items-center gap-2">
        <input value={neuerName} onChange={(e) => setNeuerName(e.target.value)}
          placeholder={texte.neuePlatzhalter}
          className="flex-1 rounded border border-linie bg-flaeche px-2 py-1.5 text-sm outline-none focus:border-blau-hell" />
        {!neuerNurDeutsch && (
          <input value={neuerNameTr} onChange={(e) => setNeuerNameTr(e.target.value)}
            placeholder={texte.nameTuerkisch}
            className="flex-1 rounded border border-linie bg-flaeche px-2 py-1.5 text-sm outline-none focus:border-blau-hell" />
        )}
        <label className="flex items-center gap-1.5 text-xs text-schrift-gedimmt">
          <Kontrollkaestchen markiert={neuerNurDeutsch} onWahl={setNeuerNurDeutsch} />
          {texte.nurAufDeutsch}
        </label>
        <button type="submit" disabled={neuerName.trim() === '' || legtGeradeAn}
          className="kaertchen-schatten cursor-pointer rounded-full bg-blau px-4 py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell disabled:cursor-not-allowed disabled:opacity-40">
          {texte.anlegen}
        </button>
      </form>

      {ladefehler && <LadefehlerHinweis sprache={sprache} onErneut={laden} />}

      {fehler && <p className="mb-2.5 max-w-md rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">{fehler}</p>}

      <ul className="kaertchen-schatten max-w-md divide-y divide-linie rounded-lg border border-linie bg-flaeche text-sm">
        {beilagen.length === 0 && (
          <li className="px-2.5 py-4 text-schrift-gedimmt">{texte.keineBeilagen}</li>
        )}
        {beilagen.map((beilage) => (
          <li key={beilage.id} className="flex items-center gap-2.5 px-2.5 py-2">
            <span className={`flex-1 text-sm ${beilage.aktiv ? '' : 'text-schrift-gedimmt line-through'}`}>
              {beideSprachenName(beilage.name, beilage.name_tr)}
            </span>
            <button
              onClick={() => apiPut(`/api/beilagen/${beilage.id}`, {
                name: beilage.name, aktiv: beilage.aktiv ? 0 : 1,
              }).catch((f) => setFehler(f.message))}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold ${
                beilage.aktiv ? 'bg-navy text-grund' : 'border border-linie text-schrift-gedimmt'
              }`}>
              {beilage.aktiv ? texte.aktiv : texte.inaktiv}
            </button>
            <button onClick={() => setBearbeitung({ ...beilage, nurDeutsch: !beilage.name_tr })}
              className="cursor-pointer rounded-full border border-linie px-2 py-1 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              {texte.umbenennen}
            </button>
            <button onClick={() => setLoeschung(beilage)}
              className="cursor-pointer rounded-full border border-linie px-2 py-1 text-sm text-weinrot hover:bg-flaeche-hell">
              {texte.loeschen}
            </button>
          </li>
        ))}
      </ul>

      {bearbeitung && (
        <Dialog titel={texte.umbenennenTitel} onSchliessen={() => setBearbeitung(null)}>
          <input value={bearbeitung.name} autoFocus
            onChange={(e) => setBearbeitung({ ...bearbeitung, name: e.target.value })}
            className="mb-2.5 w-full rounded border border-linie bg-grund px-2 py-1.5 text-sm outline-none focus:border-blau-hell" />
          <label className="mb-1 flex items-center gap-1.5 text-xs text-schrift-gedimmt">
            <Kontrollkaestchen markiert={bearbeitung.nurDeutsch}
              onWahl={(wert) => setBearbeitung({ ...bearbeitung, nurDeutsch: wert })} />
            {texte.nurAufDeutsch}
          </label>
          {!bearbeitung.nurDeutsch && (
            <input value={bearbeitung.name_tr ?? ''} placeholder={texte.nameTuerkisch}
              onChange={(e) => setBearbeitung({ ...bearbeitung, name_tr: e.target.value })}
              className="mb-2.5 w-full rounded border border-linie bg-grund px-2 py-1.5 text-sm outline-none focus:border-blau-hell" />
          )}
          <div className="flex gap-2">
            <button onClick={() => setBearbeitung(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              {texte.abbrechen}
            </button>
            <button onClick={speichern}
              className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
              {texte.speichern}
            </button>
          </div>
        </Dialog>
      )}

      {loeschung && (
        <Dialog titel={texte.beilageLoeschenTitel} onSchliessen={() => setLoeschung(null)}>
          <p className="mb-4 text-sm">
            {texte.loeschenVorspann}{beideSprachenName(loeschung.name, loeschung.name_tr)}{texte.loeschenNachspann}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setLoeschung(null)}
              className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
              {texte.abbrechen}
            </button>
            <button
              onClick={() => apiDelete(`/api/beilagen/${loeschung.id}`)
                .then(() => setLoeschung(null))
                .catch((f) => { setFehler(f.message); setLoeschung(null); })}
              className="flex-1 cursor-pointer rounded-full bg-weinrot py-1.5 text-sm font-bold text-flaeche hover:bg-weinrot-hell">
              {texte.jaLoeschen}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
