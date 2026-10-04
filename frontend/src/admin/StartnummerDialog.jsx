import { useState } from 'react';
import { apiPost } from '../api.js';
import Dialog from '../komponenten/Dialog.jsx';
import Hinweiskasten from '../komponenten/Hinweiskasten.jsx';
import Kontrollkaestchen from '../komponenten/Kontrollkaestchen.jsx';
import Zahlenfeld from '../komponenten/Zahlenfeld.jsx';
import { Button } from '@/komponenten/ui/button';
import { Label } from '@/komponenten/ui/label';
import { beideSprachenName } from '../sprache/zweisprachigerName.js';
import { de as eigeneDe, tr as eigeneTr } from '../sprache/startnummerDialog.js';
import { de as gemeinsamDe, tr as gemeinsamTr } from '../sprache/gemeinsam.js';

export default function StartnummerDialog({ artikel, onFertig, onAbbrechen, sprache = 'de' }) {
  const texte = sprache === 'tr' ? { ...gemeinsamTr, ...eigeneTr } : { ...gemeinsamDe, ...eigeneDe };
  const warnungWeitermachenPraefix = texte.warnungWeitermachenVorspann ? `${texte.warnungWeitermachenVorspann} ` : '';
  const [nummerText, setNummerText] = useState(String(artikel.naechste_nummer));
  const [warnung, setWarnung] = useState(null);
  const [gelesen, setGelesen] = useState(false);
  const [fehler, setFehler] = useState('');

  async function speichern() {
    setFehler('');
    try {
      await apiPost(`/api/artikel/${artikel.id}/startnummer`, {
        naechste_nummer: Number(nummerText),
        warnung_bestaetigt: warnung !== null && gelesen,
      });
      onFertig();
    } catch (f) {
      if (f.status === 409 && f.daten.warnung) {
        setWarnung(f.daten.warnung);
        setGelesen(false);
      } else {
        setFehler(f.message);
      }
    }
  }

  return (
    <Dialog titel={`${beideSprachenName(artikel.name, artikel.name_tr)}: ${texte.startnummerSuffix}`} onSchliessen={onAbbrechen}>
      <Label className="text-xs font-normal">{texte.weiterBeiNummer}</Label>
      <Zahlenfeld min="1" wert={nummerText} autoFokus klasse="mb-2.5 w-28"
        onWahl={(neuerWert) => { setNummerText(neuerWert); setWarnung(null); }} />

      {warnung && (
        <Hinweiskasten art="warnung" className="mb-2.5 px-2.5 py-2 text-sm">
          <p className="mb-2">
            {warnung.hoechste_nummer_heute !== null
              ? `${texte.warnungHeuteVorspann} ${warnung.hoechste_nummer_heute} ${texte.warnungHeuteNachspann} `
              : ''}
            {warnungWeitermachenPraefix}{nummerText} {texte.warnungWeitermachenNachspann}
          </p>
          <label className="flex cursor-pointer items-center gap-1.5">
            <Kontrollkaestchen markiert={gelesen} onWahl={setGelesen} />
            <span>{texte.warnungGelesen}</span>
          </label>
        </Hinweiskasten>
      )}

      {fehler && <Hinweiskasten art="fehler" className="mb-2.5 px-2 py-1.5 text-sm">{fehler}</Hinweiskasten>}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onAbbrechen} className="flex-1 text-sm text-schrift-gedimmt">
          {texte.abbrechen}
        </Button>
        <Button onClick={speichern} disabled={warnung !== null && !gelesen} className="flex-1 text-sm font-bold">
          {texte.speichern}
        </Button>
      </div>
    </Dialog>
  );
}
