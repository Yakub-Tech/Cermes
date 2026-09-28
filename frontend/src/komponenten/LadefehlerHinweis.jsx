import { de, tr } from '../sprache/gemeinsam.js';

export default function LadefehlerHinweis({ sprache = 'de', onErneut, aktionsfehler = '' }) {
  const texte = sprache === 'tr' ? tr : de;
  return (
    <div className="mb-2.5 flex items-center gap-3 rounded bg-blau/30 px-2 py-1.5 text-sm text-blau">
      <span className="flex-1">{aktionsfehler || texte.ladefehler}</span>
      <button onClick={onErneut}
        className="cursor-pointer rounded-full border border-blau px-3 py-1 font-semibold hover:bg-flaeche-hell">
        {texte.erneutLaden}
      </button>
    </div>
  );
}
