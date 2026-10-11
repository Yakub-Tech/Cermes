import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';
import { Button } from '@/komponenten/ui/button';
import { Input } from '@/komponenten/ui/input';
import { EINGABE_DICHT } from './eingabeKlasse.js';

const EINGABE = `w-auto ${EINGABE_DICHT}`;

export default function AuditFilter({ entwurf, onEntwurfAendern, onAktualisieren, onZuruecksetzen, benutzerOptionen, texte }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-2.5">
      <label className="flex flex-col gap-1 text-xs text-schrift-gedimmt">
        {texte.filterVon}
        <Input type="date" value={entwurf.von}
          onChange={(e) => onEntwurfAendern({ ...entwurf, von: e.target.value })}
          className={EINGABE} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-schrift-gedimmt">
        {texte.filterBis}
        <Input type="date" value={entwurf.bis}
          onChange={(e) => onEntwurfAendern({ ...entwurf, bis: e.target.value })}
          className={EINGABE} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-schrift-gedimmt">
        {texte.filterBenutzer}
        <Auswahlmenue wert={entwurf.benutzer}
          onWahl={(neuerBenutzer) => onEntwurfAendern({ ...entwurf, benutzer: neuerBenutzer })}
          optionen={[
            { wert: '', text: texte.filterAlleBenutzer },
            ...benutzerOptionen.map((name) => ({ wert: name, text: name })),
          ]}
          klasse="text-sm" />
      </label>
      <Button variant="outline" onClick={onZuruecksetzen} className="px-2.5 text-sm text-schrift-gedimmt">
        {texte.filterZuruecksetzen}
      </Button>
      <Button onClick={onAktualisieren} className="px-2.5 text-sm font-bold">
        {texte.filterAktualisieren}
      </Button>
    </div>
  );
}
