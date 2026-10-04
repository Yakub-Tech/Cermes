import { Link } from 'react-router-dom';
import { de, tr } from '../sprache/nichtGefunden.js';
import { Button } from '@/komponenten/ui/button';

export default function NichtGefundenInhalt({ sprache = 'de' }) {
  const texte = sprache === 'tr' ? tr : de;

  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <p className="font-display text-8xl font-semibold tracking-tight text-schrift">404</p>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-schrift">{texte.titel}</h2>
      <p className="max-w-md text-schrift-gedimmt">{texte.erklaerung}</p>
      <Button asChild className="mt-3 h-auto px-6 py-3 text-base font-bold">
        <Link to="/">{texte.zurueck}</Link>
      </Button>
    </div>
  );
}
