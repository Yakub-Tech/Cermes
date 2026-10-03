import { zweisprachigerName } from '../sprache/zweisprachigerName.js';

export default function StornoHinweis({ kaertchen, sprache, texte, onVerstanden }) {
  if (kaertchen.length === 0) return null;

  return (
    <div className="bg-grund px-3 py-3" role="alert">
      <div className="max-h-[22vh] space-y-2 overflow-y-auto border-y border-gefahr/30 p-1.5">
      {kaertchen.map((k) => {
        const beilagen = k.beilagen
          .map((name, i) => zweisprachigerName(name, (k.beilagen_tr ?? [])[i], sprache))
          .join(', ');
        return (
          <div key={k.id}
            className="warn-puls flex items-center gap-3 rounded-lg bg-gefahr px-4 py-1.5 text-white">
            <p className="min-w-0 flex-1 break-words text-sm">
              <span className="font-display text-lg font-semibold">
                {texte.stornoTitel} {texte.nrPraefix} {k.nummer}
              </span>
              {' '}
              {zweisprachigerName(k.artikel_name, k.artikel_name_tr, sprache)}
              {beilagen && `, ${beilagen}`}
              {k.sonderwunsch && ` (${k.sonderwunsch})`}
            </p>
            <button onClick={() => onVerstanden(k)}
              className="cursor-pointer rounded-lg border border-white/50 bg-white/20 px-4 py-2 font-semibold text-white hover:bg-white/30 active:scale-[0.98]">
              {texte.stornoVerstanden}
            </button>
          </div>
        );
      })}
      </div>
    </div>
  );
}
