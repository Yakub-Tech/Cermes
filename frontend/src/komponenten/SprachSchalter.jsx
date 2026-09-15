import Flagge from './Flagge.jsx';

export default function SprachSchalter({ sprache, onWahl }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onWahl('de')} aria-label="Deutsch"
        className={`cursor-pointer transition-opacity ${
          sprache === 'de' ? 'opacity-100' : 'opacity-40 hover:opacity-70'
        }`}>
        <Flagge land="de" />
      </button>
      <button type="button" onClick={() => onWahl('tr')} aria-label="Türkçe"
        className={`cursor-pointer transition-opacity ${
          sprache === 'tr' ? 'opacity-100' : 'opacity-40 hover:opacity-70'
        }`}>
        <Flagge land="tr" />
      </button>
    </div>
  );
}
