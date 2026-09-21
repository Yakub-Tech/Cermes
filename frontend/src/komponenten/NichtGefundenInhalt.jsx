import { Link } from 'react-router-dom';
import { de, tr } from '../sprache/nichtGefunden.js';

export default function NichtGefundenInhalt({ sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;

  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <p className="font-display text-8xl text-navy">404</p>
      <h2 className="font-display text-2xl text-navy">{texte.titel}</h2>
      <p className="max-w-md text-schrift-gedimmt">{texte.erklaerung}</p>
      <Link to="/"
        className="mt-3 rounded-full bg-blau px-6 py-3 font-bold text-flaeche hover:bg-blau-hell">
        {texte.zurueck}
      </Link>
    </div>
  );
}
