import Auswahlmenue from '../komponenten/Auswahlmenue.jsx';

const eingabeKlasse =
  'rounded border border-linie bg-grund px-2 py-1.5 text-sm outline-none focus:border-blau-hell';

export default function AuditFilter({ entwurf, onEntwurfAendern, onAktualisieren, onZuruecksetzen, benutzerOptionen, texte }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-2.5">
      <label className="flex flex-col gap-1 text-xs text-schrift-gedimmt">
        {texte.filterVon}
        <input type="date" value={entwurf.von}
          onChange={(e) => onEntwurfAendern({ ...entwurf, von: e.target.value })}
          className={eingabeKlasse} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-schrift-gedimmt">
        {texte.filterBis}
        <input type="date" value={entwurf.bis}
          onChange={(e) => onEntwurfAendern({ ...entwurf, bis: e.target.value })}
          className={eingabeKlasse} />
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
      <button onClick={onZuruecksetzen}
        className="cursor-pointer rounded-full border border-linie px-2.5 py-1.5 text-sm text-schrift-gedimmt hover:bg-flaeche-hell">
        {texte.filterZuruecksetzen}
      </button>
      <button onClick={onAktualisieren}
        className="kaertchen-schatten cursor-pointer rounded-full bg-blau px-2.5 py-1.5 text-sm font-bold text-flaeche hover:bg-blau-hell">
        {texte.filterAktualisieren}
      </button>
    </div>
  );
}
