import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

export default function StornoHinweis({ kaertchen, sprache, texte, onVerstanden }) {
  if (kaertchen.length === 0) return null;

  return (
    <div className="space-y-2 bg-grund px-3 pt-3" role="alert">
      {kaertchen.map((k) => {
        const beilagen = k.beilagen
          .map((name, i) => zweisprachigerName(name, (k.beilagen_tr ?? [])[i], sprache))
          .join(', ');
        return (
          <div key={k.id}
            className="warn-puls flex items-center gap-3 rounded-lg bg-weinrot px-4 py-2 text-flaeche">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg">
                {texte.stornoTitel} {texte.nrPraefix} {k.nummer}
              </p>
              <p className="break-words text-sm">
                {zweisprachigerName(k.artikel_name, k.artikel_name_tr, sprache)}
                {beilagen && `, ${beilagen}`}
                {k.sonderwunsch && ` (${k.sonderwunsch})`}
              </p>
            </div>
            <button onClick={() => onVerstanden(k)}
              className="cursor-pointer rounded-full bg-flaeche px-4 py-2 font-semibold text-weinrot active:scale-[0.98]">
              {texte.stornoVerstanden}
            </button>
          </div>
        );
      })}
    </div>
  );
}
