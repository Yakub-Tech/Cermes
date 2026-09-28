import { useState } from 'react';
import { euroZuCent, formatEuro, apiUpload, apiDelete } from '../api.js';
import Dialog from '../komponenten/Dialog.jsx';
import Zahlenfeld from '../komponenten/Zahlenfeld.jsx';
import DateiAuswahl from '../komponenten/DateiAuswahl.jsx';
import Kontrollkaestchen from '../komponenten/Kontrollkaestchen.jsx';
import { beideSprachenName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/artikelFormular.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

const NAME_MAX_LAENGE = 24;

export default function ArtikelFormular({ artikel, beilagen, rolle, onSpeichern, onAbbrechen, sprache = 'de' }) {
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [name, setName] = useState(artikel?.name ?? '');
  const [nameTr, setNameTr] = useState(artikel?.name_tr ?? '');
  const [nurDeutsch, setNurDeutsch] = useState(artikel ? !artikel.name_tr : false);
  const [farbe, setFarbe] = useState(artikel?.farbe ?? '#b53030');
  const [preisText, setPreisText] = useState(
    artikel ? formatEuro(artikel.preis_cent).replace(' €', '') : ''
  );
  const [kostenText, setKostenText] = useState(
    artikel?.einkaufskosten_cent != null
      ? formatEuro(artikel.einkaufskosten_cent).replace(' €', '') : ''
  );
  const [sortierung, setSortierung] = useState(artikel?.sortierung ?? 0);
  const [beilagenIds, setBeilagenIds] = useState(artikel?.beilagen_ids ?? []);
  const [bildUrl, setBildUrl] = useState(artikel?.bild_url ?? null);
  const [bloecke, setBloecke] = useState(artikel?.bloecke ?? []);
  const [fehler, setFehler] = useState('');

  function blockHinzufuegen() {
    setBloecke([...bloecke, { von: '', bis: '' }]);
  }

  function blockAendern(index, feld, wert) {
    setBloecke(bloecke.map((block, i) => (i === index ? { ...block, [feld]: wert } : block)));
  }

  function blockEntfernen(index) {
    setBloecke(bloecke.filter((_, i) => i !== index));
  }

  async function bildHochladen(datei) {
    setFehler('');
    try {
      const formData = new FormData();
      formData.append('bild', datei);
      const antwort = await apiUpload(`/api/artikel/${artikel.id}/bild`, formData);
      setBildUrl(antwort.bild_url);
    } catch (f) {
      setFehler(f.message);
    }
  }

  async function bildEntfernen() {
    setFehler('');
    try {
      await apiDelete(`/api/artikel/${artikel.id}/bild`);
      setBildUrl(null);
    } catch (f) {
      setFehler(f.message);
    }
  }

  function beilageUmschalten(id) {
    setBeilagenIds(beilagenIds.includes(id)
      ? beilagenIds.filter((b) => b !== id)
      : [...beilagenIds, id]);
  }

  function speichern() {
    if (!nurDeutsch && nameTr.trim() === '') {
      setFehler(`${texte.tuerkischerNameFehlerVorspann}${texte.nurAufDeutsch}${texte.tuerkischerNameFehlerNachspann}`);
      return;
    }
    const preisCent = euroZuCent(preisText);
    if (preisCent === null) {
      setFehler(texte.fehlerPreis);
      return;
    }
    let kostenCent = null;
    if (kostenText.trim() !== '') {
      kostenCent = euroZuCent(kostenText);
      if (kostenCent === null) {
        setFehler(texte.fehlerKosten);
        return;
      }
    }
    let bloeckeDaten;
    if (bloecke.length > 0) {
      bloeckeDaten = [];
      for (const block of bloecke) {
        const von = Number(block.von);
        const bis = Number(block.bis);
        if (!Number.isInteger(von) || von < 1 || !Number.isInteger(bis) || bis < von) {
          setFehler(texte.fehlerNummernblock);
          return;
        }
        bloeckeDaten.push({ von, bis });
      }
    }
    onSpeichern({
      name,
      name_tr: nurDeutsch ? '' : nameTr,
      farbe,
      preis_cent: preisCent,
      einkaufskosten_cent: kostenCent,
      sortierung: Number(sortierung) || 0,
      aktiv: artikel?.aktiv ?? 1,
      erwarteter_stand: artikel?.stand,
      beilagen_ids: beilagenIds,
      ...(bloeckeDaten ? { bloecke: bloeckeDaten } : {}),
    }).catch((f) => setFehler(f.message));
  }

  const eingabeKlasse =
    'mb-2.5 w-full rounded border border-linie bg-grund px-2 py-1.5 text-sm outline-none focus:border-blau-hell';

  return (
    <Dialog titel={artikel ? `${beideSprachenName(artikel.name, artikel.name_tr)} ${texte.bearbeitenSuffix}` : texte.titelNeu}
      onSchliessen={onAbbrechen}>
      <label className="mb-1 block text-xs text-schrift-gedimmt">{texte.name}</label>
      <input value={name} autoFocus maxLength={NAME_MAX_LAENGE} onChange={(e) => setName(e.target.value)}
        className={eingabeKlasse.replace('mb-2.5', 'mb-1')} />
      <p className="mb-2.5 text-right text-xs text-schrift-gedimmt">
        {name.length}/{NAME_MAX_LAENGE} {texte.zeichen}
      </p>

      <label className="mb-1 flex items-center gap-1.5 text-xs text-schrift-gedimmt">
        <Kontrollkaestchen markiert={nurDeutsch} onWahl={setNurDeutsch} />
        {texte.nurAufDeutsch}
      </label>
      {!nurDeutsch && (
        <>
          <label className="mb-1 block text-xs text-schrift-gedimmt">{texte.nameTuerkisch}</label>
          <input value={nameTr} maxLength={NAME_MAX_LAENGE} onChange={(e) => setNameTr(e.target.value)}
            className={eingabeKlasse} />
        </>
      )}

      <div className="flex gap-2.5">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-schrift-gedimmt">{texte.verkaufspreis}</label>
          <input value={preisText} inputMode="decimal" placeholder="3,50"
            onChange={(e) => setPreisText(e.target.value)} className={eingabeKlasse} />
        </div>
        {rolle === 'admin' && (
          <div className="flex-1">
            <label className="mb-1 block text-xs text-schrift-gedimmt">{texte.einkaufskosten}</label>
            <input value={kostenText} inputMode="decimal" placeholder={texte.einkaufskostenPlatzhalter}
              onChange={(e) => setKostenText(e.target.value)} className={eingabeKlasse} />
          </div>
        )}
      </div>

      <div className="mb-2.5 flex items-center gap-2.5">
        <div>
          <label className="mb-1 block text-xs text-schrift-gedimmt">{texte.kaertchenfarbe}</label>
          <input type="color" value={farbe} onChange={(e) => setFarbe(e.target.value)}
            className="h-8 w-14 cursor-pointer rounded border border-linie bg-grund" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-schrift-gedimmt">{texte.sortierung}</label>
          <Zahlenfeld wert={sortierung} onWahl={setSortierung} klasse="w-16" />
        </div>
      </div>

      <label className="mb-1 block text-xs text-schrift-gedimmt">{texte.beilagenLabel}</label>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {beilagen.length === 0 && (
          <p className="text-xs text-schrift-gedimmt">
            {texte.keineBeilagen}
          </p>
        )}
        {beilagen.map((beilage) => (
          <button key={beilage.id} type="button" onClick={() => beilageUmschalten(beilage.id)}
            className={`cursor-pointer rounded-full px-2.5 py-1 text-sm ${
              beilagenIds.includes(beilage.id)
                ? 'bg-navy font-semibold text-grund'
                : 'border border-linie text-schrift-gedimmt hover:bg-flaeche-hell'
            }`}>
            {beideSprachenName(beilage.name, beilage.name_tr)}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-xs text-schrift-gedimmt">
        {texte.nummernbloecke}
      </label>
      <p className="mb-2 text-xs text-schrift-gedimmt">
        {texte.nummernbloeckeErklaerung}
      </p>
      {bloecke.map((block, index) => (
        <div key={index} className="mb-1.5 flex items-center gap-1.5">
          <Zahlenfeld min="1" wert={block.von} klasse="w-24"
            onWahl={(wert) => blockAendern(index, 'von', wert)} />
          <span className="text-xs text-schrift-gedimmt">{texte.bis}</span>
          <Zahlenfeld min="1" wert={block.bis} klasse="w-24"
            onWahl={(wert) => blockAendern(index, 'bis', wert)} />
          <button type="button" onClick={() => blockEntfernen(index)}
            className="cursor-pointer rounded-full border border-linie px-2 py-1 text-xs text-weinrot hover:bg-flaeche-hell">
            {texte.entfernen}
          </button>
        </div>
      ))}
      <button type="button" onClick={blockHinzufuegen}
        className="mb-2.5 cursor-pointer rounded-full border border-linie px-2.5 py-1 text-xs text-schrift-gedimmt hover:bg-flaeche-hell">
        {texte.nummernblockHinzufuegen}
      </button>

      <label className="mb-1 block text-xs text-schrift-gedimmt">{texte.artikelbild}</label>
      <p className="mb-2 text-xs text-schrift-gedimmt">
        {texte.artikelbildErklaerung}
      </p>
      {!artikel && (
        <p className="mb-2.5 text-xs text-schrift-gedimmt">
          {texte.bildSpaeterErgaenzen}
        </p>
      )}
      {artikel && bildUrl && (
        <div className="mb-2.5 flex items-center gap-2.5">
          <img src={bildUrl} alt={artikel.name} className="h-20 w-20 rounded-lg border border-linie object-cover" />
          <button type="button" onClick={bildEntfernen}
            className="cursor-pointer rounded-full border border-linie px-2.5 py-1.5 text-sm text-weinrot hover:bg-flaeche-hell">
            {texte.bildEntfernen}
          </button>
        </div>
      )}
      {artikel && !bildUrl && (
        <div className="mb-2.5">
          <DateiAuswahl akzeptiert="image/png,image/jpeg,image/webp" beschriftung={texte.bildHochladenBeschriftung}
            typFehlerText={texte.dateiTypFehler} onWahl={bildHochladen} sprache={sprache} />
        </div>
      )}

      {fehler && <p className="mb-2.5 rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">{fehler}</p>}

      <div className="flex gap-2">
        <button onClick={onAbbrechen}
          className="flex-1 cursor-pointer rounded-full border border-linie py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
          {texte.abbrechen}
        </button>
        <button onClick={speichern}
          className="flex-1 cursor-pointer rounded-full bg-blau py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
          {texte.speichern}
        </button>
      </div>
    </Dialog>
  );
}
