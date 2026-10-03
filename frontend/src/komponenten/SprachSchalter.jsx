import Flagge from './Flagge.jsx';

const OPTIONEN = [
  ['de', 'Deutsch'],
  ['tr', 'Türkçe'],
];

export default function SprachSchalter({ sprache, onWahl }) {
  return (
    <div role="group" aria-label="Sprache / Dil"
      className="inline-flex rounded-full border border-linie bg-flaeche-hell p-0.5">
      {OPTIONEN.map(([land, name]) => (
        <button key={land} type="button" onClick={() => onWahl(land)}
          aria-label={name} aria-pressed={sprache === land} title={name}
          className={`cursor-pointer rounded-full px-2.5 py-1.5 transition-opacity ${
            sprache === land ? 'bg-flaeche shadow-sm' : 'opacity-50 hover:opacity-80'
          }`}>
          <Flagge land={land} />
        </button>
      ))}
    </div>
  );
}
