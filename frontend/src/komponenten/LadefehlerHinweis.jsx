import { de, tr } from '../sprache/gemeinsam.js';

export default function LadefehlerHinweis({ sprache = 'de', onErneut, aktionsfehler = '' }) {
  const texte = sprache === 'tr' ? tr : de;
  return (
    <div role="alert" className="mb-2.5 flex items-center gap-3 rounded-lg border border-gefahr/30 bg-gefahr/15 px-2 py-1.5 text-sm text-gefahr-schrift">
      <span className="flex-1">{aktionsfehler || texte.ladefehler}</span>
      <button onClick={onErneut}
        className="cursor-pointer rounded-lg border border-gefahr-schrift/50 px-3 py-1 font-semibold hover:bg-gefahr/15">
        {texte.erneutLaden}
      </button>
    </div>
  );
}
