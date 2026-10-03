import { useState } from 'react';
import { euroZuCent, formatEuro, apiUpload, apiDelete } from '../api.js';
import Dialog from '../komponenten/Dialog.jsx';
import Zahlenfeld from '../komponenten/Zahlenfeld.jsx';
import DateiAuswahl from '../komponenten/DateiAuswahl.jsx';
import Kontrollkaestchen from '../komponenten/Kontrollkaestchen.jsx';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import Pillenschalter from '../komponenten/Pillenschalter.jsx';
import { Button } from '@/komponenten/ui/button';
import { Input } from '@/komponenten/ui/input';
import { Label } from '@/komponenten/ui/label';
import { EINGABE_DICHT } from './eingabeKlasse.js';
import { STANDARD_ARTIKELFARBE } from './artikelStandardFarbe.js';
import { beideSprachenName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/artikelFormular.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

const NAME_MAX_LAENGE = 24;

const LABEL = 'text-xs font-normal';
const EINGABE = `mb-2.5 ${EINGABE_DICHT}`;

export default function ArtikelFormular({ artikel, beilagen, rolle, onSpeichern, onAbbrechen, sprache = 'de' }) {
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const [name, setName] = useState(artikel?.name ?? '');
  const [nameTr, setNameTr] = useState(artikel?.name_tr ?? '');
  const [nurDeutsch, setNurDeutsch] = useState(artikel ? !artikel.name_tr : false);
  const [farbe, setFarbe] = useState(artikel?.farbe ?? STANDARD_ARTIKELFARBE);
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
  const [speichertGerade, setSpeichertGerade] = useState(false);

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
    if (speichertGerade) return;
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
    setSpeichertGerade(true);
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
    }).catch((f) => setFehler(f.message)).finally(() => setSpeichertGerade(false));
  }

  function abbrechenVersuchen() {
    if (!speichertGerade) onAbbrechen();
  }

  return (
    <Dialog titel={artikel ? `${beideSprachenName(artikel.name, artikel.name_tr)} ${texte.bearbeitenSuffix}` : texte.titelNeu}
      onSchliessen={abbrechenVersuchen}>
      <Label className={LABEL}>{texte.name}</Label>
      <Input value={name} autoFocus maxLength={NAME_MAX_LAENGE} onChange={(e) => setName(e.target.value)}
        className={`mb-1 ${EINGABE_DICHT}`} />
      <p className="mb-2.5 text-right text-xs text-schrift-gedimmt">
        {name.length}/{NAME_MAX_LAENGE} {texte.zeichen}
      </p>

      <Label className="flex items-center gap-1.5 text-xs font-normal">
        <Kontrollkaestchen markiert={nurDeutsch} onWahl={setNurDeutsch} />
        {texte.nurAufDeutsch}
      </Label>
      {!nurDeutsch && (
        <>
          <Label className={LABEL}>{texte.nameTuerkisch}</Label>
          <Input value={nameTr} maxLength={NAME_MAX_LAENGE} onChange={(e) => setNameTr(e.target.value)}
            className={EINGABE} />
        </>
      )}

      <div className="flex gap-2.5">
        <div className="flex-1">
          <Label className={LABEL}>{texte.verkaufspreis}</Label>
          <Input value={preisText} inputMode="decimal" placeholder="3,50"
            onChange={(e) => setPreisText(e.target.value)} className={EINGABE} />
        </div>
        {rolle === 'admin' && (
          <div className="flex-1">
            <Label className={LABEL}>{texte.einkaufskosten}</Label>
            <Input value={kostenText} inputMode="decimal" placeholder={texte.einkaufskostenPlatzhalter}
              onChange={(e) => setKostenText(e.target.value)} className={EINGABE} />
          </div>
        )}
      </div>

      <div className="mb-2.5 flex items-center gap-2.5">
        <div>
          <Label className={LABEL}>{texte.kaertchenfarbe}</Label>
          <input type="color" value={farbe} onChange={(e) => setFarbe(e.target.value)}
            className="h-8 w-14 cursor-pointer rounded-lg border border-schrift-gedimmt/35 bg-flaeche-hell" />
        </div>
        <div>
          <Label className={LABEL}>{texte.sortierung}</Label>
          <Zahlenfeld wert={sortierung} onWahl={setSortierung} klasse="w-16" />
        </div>
      </div>

      <Label className={LABEL}>{texte.beilagenLabel}</Label>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {beilagen.length === 0 && (
          <p className="text-xs text-schrift-gedimmt">
            {texte.keineBeilagen}
          </p>
        )}
        {beilagen.map((beilage) => (
          <Pillenschalter key={beilage.id} an={beilagenIds.includes(beilage.id)} art="haupt"
            onClick={() => beilageUmschalten(beilage.id)} className="text-sm">
            {beideSprachenName(beilage.name, beilage.name_tr)}
          </Pillenschalter>
        ))}
      </div>

      <Label className={LABEL}>{texte.nummernbloecke}</Label>
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
          <Button type="button" variant="outline" size="sm" onClick={() => blockEntfernen(index)}
            className="px-2 text-xs text-gefahr-schrift">
            {texte.entfernen}
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={blockHinzufuegen}
        className="mb-2.5 px-2.5 text-xs text-schrift-gedimmt">
        {texte.nummernblockHinzufuegen}
      </Button>

      <Label className={LABEL}>{texte.artikelbild}</Label>
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
          <Button type="button" variant="outline" size="sm" onClick={bildEntfernen}
            className="px-2.5 text-sm text-gefahr-schrift">
            {texte.bildEntfernen}
          </Button>
        </div>
      )}
      {artikel && !bildUrl && (
        <div className="mb-2.5">
          <DateiAuswahl akzeptiert="image/png,image/jpeg,image/webp" beschriftung={texte.bildHochladenBeschriftung}
            typFehlerText={texte.dateiTypFehler} onWahl={bildHochladen} sprache={sprache} />
        </div>
      )}

      {fehler && <Hinweiskasten art="fehler" className="mb-2.5 px-2 py-1.5 text-sm">{fehler}</Hinweiskasten>}

      <div className="flex gap-2">
        <Button variant="outline" onClick={abbrechenVersuchen} disabled={speichertGerade}
          className="flex-1 text-sm text-schrift-gedimmt">
          {texte.abbrechen}
        </Button>
        <Button onClick={speichern} disabled={speichertGerade} className="flex-1 text-sm font-bold">
          {texte.speichern}
        </Button>
      </div>
    </Dialog>
  );
}
